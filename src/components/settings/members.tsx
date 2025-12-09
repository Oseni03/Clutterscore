"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Calendar, Users, Clock, Send, X } from "lucide-react";
import { format } from "date-fns";
import {
	Dialog,
	DialogDescription,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { InvitationForm } from "@/components/forms/invitation-form";
import { UpdateMemberRoleForm } from "@/components/forms/update-member-role-form";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { removeMember } from "@/server/members";
import { cancelInvitation } from "@/server/invitations";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

export default function MembersCard() {
	const {
		activeOrganization,
		members,
		invitations,
		isAdmin,
		removeInvite,
		removeMember: removeMemberState,
	} = useOrganizationStore((state) => state);
	const { user } = authClient.useSession().data || {};
	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const [isMemberOpen, setIsMemberOpen] = useState(false);

	async function handleRemoveMember(memberId: string) {
		try {
			toast.loading("Removing member...");

			if (!activeOrganization) return;

			if (!isAdmin) {
				toast.dismiss();
				toast.error("You do not have permission to remove members");
				return;
			}

			const { data, error } = await removeMember(
				activeOrganization.id,
				memberId
			);

			if (data) {
				removeMemberState(data.member.id);
			}

			if (error) {
				logger.error("Error removing member:", error);
				toast.dismiss();
				toast.error("Unable to remove member");
			} else {
				toast.dismiss();
				toast.success("Member remove successfully");
			}
		} catch (error) {
			logger.error("Failed to remove member", error);
			toast.dismiss();
			toast.error("Failed to remove member");
		}
	}

	async function handleCancelInvitation(invitationId: string) {
		try {
			toast.loading("Canceling invite...");

			if (!activeOrganization) return;

			const { data, success, error } =
				await cancelInvitation(invitationId);

			if (data) {
				removeInvite(data.id);
			}

			if (!success) {
				logger.error("Error canceling Invite:", error);
				toast.dismiss();
				toast.error("Failed to can invite");
				return;
			}

			toast.dismiss();
			toast.success("Invite canceled successfully");
		} catch (error) {
			logger.error("Error handling invitation cancelation:", error);
			toast.dismiss();
			toast.error("Failed to cancel invite");
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-lg sm:text-xl font-bold text-foreground">
							User Management
						</h1>
						<p className="text-sm text-muted-foreground">
							{members?.length || 0} users
						</p>
					</div>
					<DialogTrigger asChild>
						<Button
							disabled={!isAdmin}
							className="w-full sm:w-auto"
						>
							<Users className="w-4 h-4 mr-2" />
							<span>Invite User</span>
						</Button>
					</DialogTrigger>
				</div>
				{/* Create Dialog Content */}
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Invite User</DialogTitle>
						<DialogDescription>
							Invite a new user to your workspace.
						</DialogDescription>
					</DialogHeader>
					<InvitationForm onSuccess={() => setIsInviteOpen(false)} />
				</DialogContent>
			</Dialog>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total Users
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{members?.length}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Admins
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{members?.filter((u) => u.role === "admin").length}
						</div>
						<div className="text-xs text-muted-foreground">
							Admin users
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Regular Users
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{members?.filter((u) => u.role === "member").length}
						</div>
						<div className="text-xs text-muted-foreground">
							Standard users
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Pending Invites
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{invitations?.filter(
								(inv) => inv.status === "pending"
							).length || 0}
						</div>
						<div className="text-xs text-muted-foreground">
							Awaiting response
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Pending Invitations */}
			{invitations &&
				invitations?.filter((inv) => inv.status === "pending").length >
					0 && (
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">
							Pending Invitations
						</h2>
						<div className="grid gap-4">
							{invitations
								?.filter((inv) => inv.status === "pending")
								.map((invitation) => (
									<Card key={invitation.id}>
										<CardContent className="p-6">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-4">
													<Avatar className="h-12 w-12">
														<AvatarFallback className="bg-orange-100 text-orange-600 font-medium">
															{invitation.email
																.split("@")[0]
																.slice(0, 2)
																.toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<div>
														<div className="flex items-center gap-2">
															<h3 className="font-medium">
																{
																	invitation.email
																}
															</h3>
															<Badge
																variant="outline"
																className="text-orange-600 border-orange-200"
															>
																{
																	invitation.role
																}
															</Badge>
															<Badge
																variant="secondary"
																className="text-xs bg-orange-50 text-orange-600"
															>
																Pending
															</Badge>
														</div>
														<div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
															<div className="flex items-center gap-1">
																<Clock className="w-3 h-3" />
																Expires{" "}
																{format(
																	invitation.expiresAt,
																	"MMM dd, yyyy"
																)}
															</div>
															{/* <div className="flex items-center gap-1">
                                                                <User className="w-3 h-3" />
                                                                By{" "}
                                                                {
                                                                    invitation
                                                                        .invitedBy
                                                                        ?.name
                                                                }
                                                            </div> */}
														</div>
													</div>
												</div>
												<div className="flex gap-2">
													<Button
														variant="outline"
														size="sm"
														// onClick={() =>
														// 	handleResendInvitation(
														// 		invitation.id
														// 	)
														// }
														disabled={!isAdmin}
													>
														<Send className="w-3 h-3 mr-1" />
														Resend
													</Button>
													<AlertDialog>
														<AlertDialogTrigger
															asChild
														>
															<Button
																variant="outline"
																size="sm"
																disabled={
																	!isAdmin
																}
															>
																<X className="w-3 h-3 mr-1" />
																Cancel
															</Button>
														</AlertDialogTrigger>
														<AlertDialogContent>
															<AlertDialogHeader>
																<AlertDialogTitle>
																	Cancel
																	Invitation?
																</AlertDialogTitle>
																<AlertDialogDescription>
																	This will
																	cancel the
																	pending
																	invitation
																	for{" "}
																	<span className="font-medium">
																		{
																			invitation.email
																		}
																	</span>
																	. They will
																	no longer be
																	able to join
																	using this
																	invitation
																	link.
																</AlertDialogDescription>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel>
																	Keep
																	Invitation
																</AlertDialogCancel>
																<AlertDialogAction
																	disabled={
																		!isAdmin
																	}
																	onClick={() =>
																		handleCancelInvitation(
																			invitation.id
																		)
																	}
																	className="bg-red-600 hover:bg-red-700"
																>
																	Cancel
																	Invitation
																</AlertDialogAction>
															</AlertDialogFooter>
														</AlertDialogContent>
													</AlertDialog>
												</div>
											</div>
										</CardContent>
									</Card>
								))}
						</div>
					</div>
				)}

			{/* Users List */}
			{members.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Team Members</h2>
					<div className="grid gap-4">
						{members?.map((member) => (
							<Card key={member.id}>
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4">
											<Avatar className="h-12 w-12">
												<AvatarFallback className="bg-primary text-primary-foreground font-medium">
													{member.user.name
														.split(" ")
														.map((n) => n[0])
														.join("")}
												</AvatarFallback>
											</Avatar>
											<div>
												<div className="flex items-center gap-2">
													<h3 className="font-medium">
														{member.user.name}
													</h3>
													<Badge
														variant={
															member.role ===
															"admin"
																? "default"
																: "secondary"
														}
													>
														{member.role}
													</Badge>
													{member.userId ===
														user?.id && (
														<Badge
															variant="outline"
															className="text-xs"
														>
															You
														</Badge>
													)}
												</div>
												<div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
													<div className="flex items-center gap-1">
														<Mail className="w-3 h-3" />
														{member.user.email}
													</div>
													<div className="flex items-center gap-1">
														<Calendar className="w-3 h-3" />
														Joined{" "}
														{format(
															member.createdAt,
															"MMM yyyy"
														)}
													</div>
												</div>
											</div>
										</div>
										<div className="flex gap-2">
											<Dialog
												open={isMemberOpen}
												onOpenChange={setIsMemberOpen}
											>
												<DialogTrigger asChild>
													<Button
														variant="outline"
														size="sm"
														disabled={
															member.userId ===
																user?.id ||
															!isAdmin
														}
													>
														Edit
													</Button>
												</DialogTrigger>
												{/* Update Dialog Content */}
												<DialogContent>
													<DialogHeader>
														<DialogTitle>
															Update Member
														</DialogTitle>
														<DialogDescription>
															Update member role
															of your workspace.
														</DialogDescription>
													</DialogHeader>
													<UpdateMemberRoleForm
														defaultValues={{
															email: member.user
																.email,
															role: member.role as
																| "member"
																| "admin",
														}}
														memberId={member.id}
														onSuccess={() =>
															setIsMemberOpen(
																false
															)
														}
													/>
												</DialogContent>
											</Dialog>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														variant="outline"
														size="sm"
														disabled={
															member.userId ===
																user?.id ||
															!isAdmin
														}
													>
														Remove
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															Are you absolutely
															sure?
														</AlertDialogTitle>
														<AlertDialogDescription>
															This action cannot
															be undone. This will
															permanently remove
															user from Workspace.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>
															Cancel
														</AlertDialogCancel>
														<AlertDialogAction
															onClick={() =>
																handleRemoveMember(
																	member.id
																)
															}
														>
															Continue
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{members?.length === 0 && (
				<div className="text-center py-12">
					<Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
					<p className="text-muted-foreground">
						No users found for this workspace.
					</p>
				</div>
			)}
		</div>
	);
}
