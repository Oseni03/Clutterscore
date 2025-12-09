"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Crown, Loader2, Mail, ShieldAlert } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { DialogFooter } from "../ui/dialog";
import { authClient } from "@/lib/auth-client";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { Invitation } from "better-auth/plugins";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

const formSchema = z.object({
	email: z.email("Please enter a valid email address"),
	role: z.enum(["admin", "member"]),
});

// Subscription upgrade toast helper
const showUpgradeToast = (router: ReturnType<typeof useRouter>) => {
	toast.error("Upgrade Required", {
		description:
			"Team invitations are only available on Pro and Enterprise plans. Upgrade to collaborate with your team.",
		duration: 6000,
		action: {
			label: (
				<Button
					size="sm"
					variant="default"
					className="gap-2"
					onClick={() => router.push("/settings/billing")}
				>
					<Crown className="h-4 w-4" />
					Upgrade
				</Button>
			),
			onClick: () => router.push("/settings/billing"),
		},
	});
};

export function InvitationForm({ onSuccess }: { onSuccess: () => void }) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const { addInvitation, activeOrganization, isAdmin } = useOrganizationStore(
		(state) => state
	);

	const subscriptionTier = activeOrganization?.subscriptionTier || "free";
	const canInvite = isAdmin && subscriptionTier !== "free";

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			role: "member",
		},
	});

	// Reset form when dialog opens
	useEffect(() => {
		form.reset();
	}, [form]);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		// 🚨 PERMISSION CHECK: Only admin/owner can invite
		if (!isAdmin) {
			toast.error("Permission Denied", {
				description:
					"Only administrators and owners can send team invitations.",
				duration: 5000,
			});
			return;
		}

		// 🚨 SUBSCRIPTION CHECK: Free tier cannot invite members
		if (subscriptionTier === "free") {
			showUpgradeToast(router);
			return;
		}

		try {
			toast.loading("Sending invitation...");
			setIsLoading(true);

			if (!activeOrganization) {
				toast.dismiss();
				toast.error("No active organization selected");
				return;
			}

			const { error, data } = await authClient.organization.inviteMember({
				email: values.email,
				role: values.role,
				organizationId: activeOrganization.id,
				resend: true,
			});

			if (error) {
				logger.error("Error creating invite:", error);
				toast.dismiss();
				toast.error(error.message || "Failed to create invitation");
				return;
			}

			if (data) {
				addInvitation(data as Invitation);
			}

			toast.dismiss();
			toast.success("Invitation sent successfully", {
				description: `An invitation email has been sent to ${values.email}`,
				icon: <Mail className="h-4 w-4" />,
			});

			form.reset();
			onSuccess();
		} catch (error) {
			logger.error("Failed to create invitation", error);
			toast.dismiss();
			toast.error("Failed to create invitation");
		} finally {
			setIsLoading(false);
		}
	}

	// Show permission/subscription alerts
	if (!isAdmin) {
		return (
			<Alert variant="destructive">
				<ShieldAlert className="h-4 w-4" />
				<AlertDescription>
					Only administrators and owners can send team invitations.
					Please contact your workspace admin for access.
				</AlertDescription>
			</Alert>
		);
	}

	if (subscriptionTier === "free") {
		return (
			<div className="space-y-4">
				<Alert>
					<Crown className="h-4 w-4" />
					<AlertDescription>
						Team invitations are only available on Pro and
						Enterprise plans. Upgrade to collaborate with your team
						and unlock unlimited integrations.
					</AlertDescription>
				</Alert>
				<DialogFooter>
					<Button
						onClick={() => router.push("/settings/billing")}
						className="w-full"
					>
						<Crown className="mr-2 h-4 w-4" />
						Upgrade to Pro
					</Button>
				</DialogFooter>
			</div>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email Address</FormLabel>
							<FormControl>
								<div className="relative">
									<Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="colleague@example.com"
										className="pl-10"
										{...field}
									/>
								</div>
							</FormControl>
							<FormDescription>
								Enter the email address of the person you want
								to invite
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="role"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Role</FormLabel>
							<Select
								onValueChange={field.onChange}
								defaultValue={field.value}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select a role" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="member">
										<div className="flex flex-col items-start">
											<span className="font-medium">
												Member
											</span>
											<span className="text-xs text-muted-foreground">
												Can view and use workspace
												features
											</span>
										</div>
									</SelectItem>
									<SelectItem value="admin">
										<div className="flex flex-col items-start">
											<span className="font-medium">
												Admin
											</span>
											<span className="text-xs text-muted-foreground">
												Full access including member
												management
											</span>
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
							<FormDescription>
								Choose the access level for this team member
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<DialogFooter>
					<Button
						disabled={isLoading || !canInvite}
						type="submit"
						className="w-full sm:w-auto"
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Sending Invitation...
							</>
						) : (
							<>
								<Mail className="mr-2 h-4 w-4" />
								Send Invitation
							</>
						)}
					</Button>
				</DialogFooter>
			</form>
		</Form>
	);
}
