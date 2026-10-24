"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
	Calendar,
	Loader2,
	Mail,
	Plus,
	Send,
	ShieldCheck,
	Users,
	X,
} from "lucide-react";
import type { Invitation as AuthInvitation } from "better-auth/plugins";
import type { Invitation as PrismaInvitation } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SettingsHeader } from "@/components/settings/settings-header";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { removeMember, updateMemberRole } from "@/server/members";
import { cancelInvitation } from "@/server/invitations";
import { getUser } from "@/server/users";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import type { Member, MemberUser } from "@/types";

const AVATAR_STYLES = [
	"bg-lime text-ink",
	"bg-[#B9A9D6] text-ink",
	"bg-[#8FA9A8] text-ink",
	"bg-[#F4B183] text-ink",
];

const ROLE_OPTIONS = [
	{
		value: "admin" as const,
		label: "Admin",
		description:
			"Manage users, billing, integrations and run playbooks.",
	},
	{
		value: "member" as const,
		label: "Member",
		description: "View audits and review playbooks.",
	},
];

function getInitials(name: string) {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

function getAvatarStyle(seed: string) {
	const index = seed
		.split("")
		.reduce((total, character) => total + character.charCodeAt(0), 0);
	return AVATAR_STYLES[index % AVATAR_STYLES.length];
}

function roleLabel(role: string | null) {
	return role === "admin" ? "Admin" : "Member";
}

function invitationExpiry(expiresAt: Date | string) {
	const date = new Date(expiresAt);

	if (date.getTime() < Date.now()) {
		return "expired";
	}

	return `expires in ${formatDistanceToNow(date)}`;
}

export default function MembersCard() {
	const {
		activeOrganization,
		members,
		invitations,
		isAdmin,
		addInvitation,
		removeInvite,
		updateMember,
		removeMember: removeMemberState,
	} = useOrganizationStore((state) => state);
	const { data: session } = authClient.useSession();
	const currentUserId = session?.user?.id;

	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const [inviteEmail, setInviteEmail] = useState("");
	const [isInviting, setIsInviting] = useState(false);
	const [resendingId, setResendingId] = useState<string | null>(null);

	const [roleMember, setRoleMember] = useState<Member | null>(null);
	const [roleValue, setRoleValue] = useState<"admin" | "member">("member");
	const [isSavingRole, setIsSavingRole] = useState(false);

	const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
	const [isRemovingMember, setIsRemovingMember] = useState(false);

	const [inviteToCancel, setInviteToCancel] =
		useState<PrismaInvitation | null>(null);
	const [isCancellingInvite, setIsCancellingInvite] = useState(false);

	const pendingInvitations = invitations.filter(
		(invitation) => invitation.status === "pending"
	);
	const adminCount = members.filter((member) => member.role === "admin").length;
	const memberCount = members.filter(
		(member) => member.role === "member"
	).length;
	const subscriptionTier = activeOrganization?.subscriptionTier || "free";
	const canInvite = isAdmin && subscriptionTier !== "free";

	const handleInviteOpenChange = (open: boolean) => {
		setIsInviteOpen(open);
		if (!open) setInviteEmail("");
	};

	async function handleInvite(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!activeOrganization) {
			toast.error("No active workspace selected");
			return;
		}

		if (!canInvite) {
			toast.error("Upgrade to invite team members");
			return;
		}

		const email = inviteEmail.trim().toLowerCase();

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			toast.error("Enter a valid work email");
			return;
		}

		setIsInviting(true);
		const toastId = toast.loading("Sending invitation...");

		try {
			const { data, error } = await authClient.organization.inviteMember({
				email,
				role: "member",
				organizationId: activeOrganization.id,
				resend: true,
			});

			if (error) {
				toast.error(error.message || "Failed to send invitation", {
					id: toastId,
				});
				return;
			}

			if (data) {
				addInvitation(data as AuthInvitation);
			}

			toast.success("Invitation sent", {
				id: toastId,
				description: `An invitation email has been sent to ${email}.`,
			});
			handleInviteOpenChange(false);
		} catch (error) {
			logger.error("Failed to invite member", error);
			toast.error("Failed to send invitation", { id: toastId });
		} finally {
			setIsInviting(false);
		}
	}

	async function handleResendInvitation(invitation: PrismaInvitation) {
		if (!activeOrganization || !isAdmin) return;

		setResendingId(invitation.id);
		const toastId = toast.loading("Resending invitation...");

		try {
			const { data, error } = await authClient.organization.inviteMember({
				email: invitation.email,
				role: invitation.role as "admin" | "member",
				organizationId: activeOrganization.id,
				resend: true,
			});

			if (error) {
				toast.error(error.message || "Failed to resend invitation", {
					id: toastId,
				});
				return;
			}

			if (data?.id) {
				removeInvite(data.id);
				addInvitation(data as AuthInvitation);
			}

			toast.success("Invitation resent", { id: toastId });
		} catch (error) {
			logger.error("Failed to resend invitation", error);
			toast.error("Failed to resend invitation", { id: toastId });
		} finally {
			setResendingId(null);
		}
	}

	async function handleCancelInvitation() {
		if (!inviteToCancel) return;

		setIsCancellingInvite(true);
		const toastId = toast.loading("Cancelling invitation...");

		try {
			const { data, success, error } = await cancelInvitation(
				inviteToCancel.id
			);

			if (!success) {
				logger.error("Failed to cancel invitation", error);
				toast.error("Failed to cancel invitation", { id: toastId });
				return;
			}

			if (data) {
				removeInvite(data.id);
			}

			toast.success("Invitation cancelled", { id: toastId });
			setInviteToCancel(null);
		} catch (error) {
			logger.error("Failed to cancel invitation", error);
			toast.error("Failed to cancel invitation", { id: toastId });
		} finally {
			setIsCancellingInvite(false);
		}
	}

	function openRoleDialog(member: Member) {
		setRoleMember(member);
		setRoleValue(member.role === "admin" ? "admin" : "member");
	}

	async function handleSaveRole() {
		if (!roleMember || !activeOrganization) return;

		setIsSavingRole(true);
		const toastId = toast.loading("Updating member role...");

		try {
			const { data, success, error } = await updateMemberRole(
				roleMember.id,
				activeOrganization.id,
				roleValue
			);

			if (!success || !data) {
				logger.error("Failed to update member role", error);
				toast.error("Failed to update member role", { id: toastId });
				return;
			}

			const updatedUser = await getUser(data.userId);
			updateMember({
				...data,
				user:
					(updatedUser?.data as MemberUser | undefined) ??
					roleMember.user,
			});

			toast.success("Role updated", {
				id: toastId,
				description: `${roleMember.user.name} is now ${
					roleValue === "admin" ? "an" : "a"
				} ${roleValue}.`,
			});
			setRoleMember(null);
		} catch (error) {
			logger.error("Failed to update member role", error);
			toast.error("Failed to update member role", { id: toastId });
		} finally {
			setIsSavingRole(false);
		}
	}

	async function handleRemoveMember() {
		if (!memberToRemove || !activeOrganization) return;

		setIsRemovingMember(true);
		const toastId = toast.loading("Removing member...");

		try {
			const { data, success, error } = await removeMember(
				activeOrganization.id,
				memberToRemove.id
			);

			if (!success || !data) {
				logger.error("Failed to remove member", error);
				toast.error("Unable to remove member", { id: toastId });
				return;
			}

			removeMemberState(data.member.id);
			toast.success("Member removed", { id: toastId });
			setMemberToRemove(null);
		} catch (error) {
			logger.error("Failed to remove member", error);
			toast.error("Failed to remove member", { id: toastId });
		} finally {
			setIsRemovingMember(false);
		}
	}

	return (
		<div className="space-y-6 p-6 md:p-8">
			<Dialog open={isInviteOpen} onOpenChange={handleInviteOpenChange}>
				<SettingsHeader
					title="Users"
					subtitle={`${members.length} ${
						members.length === 1 ? "user" : "users"
					} in this workspace`}
					action={
						isAdmin ? (
							<DialogTrigger asChild>
								<Button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink/90">
									<Plus className="size-4" />
									Invite User
								</Button>
							</DialogTrigger>
						) : undefined
					}
				/>

				<DialogContent
					showCloseButton={false}
					className="max-w-[460px] gap-0 rounded-2xl p-7"
				>
					<DialogHeader className="gap-0 text-left">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Invite a user
						</DialogTitle>
						<DialogDescription className="mt-2 text-sm text-muted-foreground">
							Send an invitation to join this workspace.
						</DialogDescription>
					</DialogHeader>

					{subscriptionTier === "free" ? (
						<div className="mt-5 rounded-xl bg-muted p-4">
							<p className="text-sm font-semibold">
								Upgrade to invite your team
							</p>
							<p className="mt-1 text-[13px] text-muted-foreground">
								Team invitations are available on Pro plans.
								Upgrade to collaborate with your team.
							</p>
							<Link
								href="/dashboard/settings/billing"
								className="mt-4 inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/90"
							>
								View plans
							</Link>
						</div>
					) : (
						<form onSubmit={handleInvite}>
							<label
								htmlFor="invite-email"
								className="mt-5 block text-sm font-medium"
							>
								Work email
							</label>
							<Input
								id="invite-email"
								type="email"
								value={inviteEmail}
								onChange={(event) =>
									setInviteEmail(event.target.value)
								}
								placeholder="teammate@company.com"
								className="mt-2 h-12 rounded-xl border-border bg-background px-4 text-[15px]"
								autoComplete="email"
								required
							/>
							<div className="mt-6 flex flex-wrap justify-end gap-3">
								<Button
									type="button"
									variant="secondary"
									onClick={() => handleInviteOpenChange(false)}
									disabled={isInviting}
									className="h-11 rounded-full px-6 text-sm font-semibold"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={isInviting}
									className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-paper hover:bg-ink/90"
								>
									{isInviting ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Send className="size-4" />
									)}
									Send invite
								</Button>
							</div>
						</form>
					)}

					{subscriptionTier === "free" && (
						<div className="mt-6 flex justify-end">
							<Button
								type="button"
								variant="secondary"
								onClick={() => handleInviteOpenChange(false)}
								className="h-11 rounded-full px-6 text-sm font-semibold"
							>
								Cancel
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<div className="rounded-2xl border border-border bg-background p-5">
					<p className="text-[13px] text-muted-foreground">
						Total users
					</p>
					<p className="mt-3 font-display text-[32px] font-semibold leading-none tracking-[-0.04em]">
						{members.length}
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						In this workspace
					</p>
				</div>
				<div className="rounded-2xl border border-border bg-background p-5">
					<p className="text-[13px] text-muted-foreground">Admins</p>
					<p className="mt-3 font-display text-[32px] font-semibold leading-none tracking-[-0.04em]">
						{adminCount}
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						Full access
					</p>
				</div>
				<div className="rounded-2xl border border-border bg-background p-5">
					<p className="text-[13px] text-muted-foreground">
						Regular users
					</p>
					<p className="mt-3 font-display text-[32px] font-semibold leading-none tracking-[-0.04em]">
						{memberCount}
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						Standard access
					</p>
				</div>
				<div className="rounded-2xl bg-night p-5 text-paper">
					<p className="text-[13px] text-[#A8A8A2]">
						Pending invites
					</p>
					<p className="mt-3 font-display text-[32px] font-semibold leading-none tracking-[-0.04em] text-lime">
						{pendingInvitations.length}
					</p>
					<p className="mt-2 text-xs text-[#A8A8A2]">
						Awaiting response
					</p>
				</div>
			</div>

			{pendingInvitations.length > 0 && (
				<section className="space-y-3">
					<h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">
						Pending invitations
					</h2>
					<div className="space-y-3">
						{pendingInvitations.map((invitation) => (
							<div
								key={invitation.id}
								className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-border bg-background p-5"
							>
								<div className="flex min-w-0 flex-1 items-center gap-4">
									<span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted font-display text-lg font-semibold text-muted-foreground">
										?
									</span>
									<div className="min-w-0">
										<p className="truncate text-[15px] font-semibold">
											{invitation.email}
										</p>
										<p className="mt-0.5 text-[13px] text-muted-foreground">
											Invited as{" "}
											{roleLabel(invitation.role)} -{" "}
											{invitationExpiry(invitation.expiresAt)}
										</p>
									</div>
								</div>
								<div className="flex shrink-0 gap-2">
									<Button
										variant="secondary"
										size="sm"
										onClick={() =>
											handleResendInvitation(invitation)
										}
										disabled={
											!isAdmin ||
											resendingId === invitation.id
										}
										className="h-10 rounded-full px-4 text-sm font-semibold"
									>
										{resendingId === invitation.id ? (
											<Loader2 className="size-3.5 animate-spin" />
										) : (
											<Send className="size-3.5" />
										)}
										Resend
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											setInviteToCancel(invitation)
										}
										disabled={!isAdmin}
										className="h-10 rounded-full px-4 text-sm font-semibold"
									>
										<X className="size-3.5" />
										Cancel invite
									</Button>
								</div>
							</div>
						))}
					</div>
				</section>
			)}

			<section className="space-y-3">
				<h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">
					Team members
				</h2>

				{members.length === 0 ? (
					<div className="rounded-2xl border border-border bg-background px-6 py-14 text-center">
						<Users className="mx-auto size-8 text-muted-foreground" />
						<p className="mt-3 text-sm text-muted-foreground">
							No users found for this workspace.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{members.map((member) => {
							const isSelf = member.userId === currentUserId;
							const canManage = isAdmin && !isSelf;

							return (
								<div
									key={member.id}
									className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-background p-5"
								>
									<div className="flex min-w-0 flex-1 items-center gap-4">
										<span
											className={`flex size-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${getAvatarStyle(
												member.user.name
											)}`}
										>
											{getInitials(member.user.name)}
										</span>
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-2">
												<p className="truncate text-[15px] font-semibold">
													{member.user.name}
												</p>
												{isSelf && (
													<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
														You
													</span>
												)}
												<span
													className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
														member.role === "admin"
															? "bg-ink text-paper"
															: "bg-muted text-foreground"
													}`}
												>
													{roleLabel(member.role)}
												</span>
											</div>
											<div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
												<span className="flex items-center gap-1.5">
													<Mail className="size-3.5" />
													{member.user.email}
												</span>
												<span className="flex items-center gap-1.5">
													<Calendar className="size-3.5" />
													Joined{" "}
													{format(
														new Date(member.createdAt),
														"MMM d, yyyy"
													)}
												</span>
											</div>
										</div>
									</div>
									<div className="flex shrink-0 gap-2">
										<Button
											variant="secondary"
											size="sm"
											onClick={() => openRoleDialog(member)}
											disabled={!canManage}
											className="h-10 rounded-full px-4 text-sm font-semibold"
										>
											Edit role
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setMemberToRemove(member)
											}
											disabled={!canManage}
											className="h-10 rounded-full px-4 text-sm font-semibold"
										>
											Remove
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</section>

			{!isAdmin && (
				<div className="rounded-xl bg-muted px-4 py-3 text-[13px] text-muted-foreground">
					Only workspace admins can invite, edit or remove users.
				</div>
			)}

			<Dialog
				open={!!roleMember}
				onOpenChange={(open) => {
					if (!open) setRoleMember(null);
				}}
			>
				<DialogContent
					showCloseButton={false}
					className="max-w-[460px] gap-0 rounded-2xl p-7"
				>
					<DialogHeader className="gap-0 text-left">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Change role for {roleMember?.user.name}
						</DialogTitle>
						<DialogDescription className="mt-2 text-sm text-muted-foreground">
							Choose what this person can do in the workspace.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-5 space-y-2.5">
						{ROLE_OPTIONS.map((option) => {
							const selected = roleValue === option.value;

							return (
								<label
									key={option.value}
									className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
										selected
											? "border-ink bg-muted"
											: "border-border bg-background hover:bg-muted/60"
									}`}
								>
									<input
										type="radio"
										name="member-role"
										value={option.value}
										checked={selected}
										onChange={() =>
											setRoleValue(option.value)
										}
										className="sr-only"
									/>
									<span
										className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
											selected
												? "border-ink"
												: "border-border"
										}`}
									>
										{selected && (
											<span className="size-2.5 rounded-full bg-ink" />
										)}
									</span>
									<span>
										<span className="block text-sm font-semibold">
											{option.label}
										</span>
										<span className="mt-0.5 block text-[13px] text-muted-foreground">
											{option.description}
										</span>
									</span>
								</label>
							);
						})}
					</div>

					<div className="mt-6 flex flex-wrap justify-end gap-3">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setRoleMember(null)}
							disabled={isSavingRole}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={handleSaveRole}
							disabled={isSavingRole}
							className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-paper hover:bg-ink/90"
						>
							{isSavingRole ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<ShieldCheck className="size-4" />
							)}
							Save role
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!memberToRemove}
				onOpenChange={(open) => {
					if (!open) setMemberToRemove(null);
				}}
			>
				<DialogContent
					showCloseButton={false}
					className="max-w-[460px] gap-0 rounded-2xl p-7"
				>
					<DialogHeader className="gap-0 text-left">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Remove {memberToRemove?.user.name}?
						</DialogTitle>
						<DialogDescription className="mt-2.5 text-sm text-muted-foreground">
							They will lose access to this workspace right away.
							You can invite them again later.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-6 flex flex-wrap justify-end gap-3">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setMemberToRemove(null)}
							disabled={isRemovingMember}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={handleRemoveMember}
							disabled={isRemovingMember}
							className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-paper hover:bg-ink/90"
						>
							{isRemovingMember && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Remove user
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!inviteToCancel}
				onOpenChange={(open) => {
					if (!open) setInviteToCancel(null);
				}}
			>
				<DialogContent
					showCloseButton={false}
					className="max-w-[460px] gap-0 rounded-2xl p-7"
				>
					<DialogHeader className="gap-0 text-left">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Cancel invitation?
						</DialogTitle>
						<DialogDescription className="mt-2.5 text-sm text-muted-foreground">
							This cancels the pending invitation for{" "}
							<span className="font-semibold text-foreground">
								{inviteToCancel?.email}
							</span>
							. They will no longer be able to join using this
							link.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-6 flex flex-wrap justify-end gap-3">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setInviteToCancel(null)}
							disabled={isCancellingInvite}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							Keep invitation
						</Button>
						<Button
							type="button"
							onClick={handleCancelInvitation}
							disabled={isCancellingInvite}
							className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-paper hover:bg-ink/90"
						>
							{isCancellingInvite && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Cancel invitation
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
