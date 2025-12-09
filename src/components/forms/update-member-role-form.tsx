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
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { DialogFooter } from "../ui/dialog";
import { updateMemberRole } from "@/server/members";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { getUser } from "@/server/users";
import { MemberUser } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logger } from "@/lib/logger";

const formSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	role: z.enum(["admin", "member"]),
});

export function UpdateMemberRoleForm({
	defaultValues,
	memberId,
	onSuccess,
}: {
	defaultValues: z.infer<typeof formSchema>;
	memberId: string;
	onSuccess: () => void;
}) {
	const { activeOrganization, isAdmin, updateMember } = useOrganizationStore(
		(state) => state
	);

	const [isLoading, setIsLoading] = useState(false);
	const canUpdateRole = isAdmin;

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues,
	});

	// Reset form when defaultValues change
	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		// 🚨 PERMISSION CHECK: Only admin/owner can update roles
		if (!canUpdateRole) {
			toast.error("Permission Denied", {
				description:
					"Only administrators and owners can update member roles.",
				duration: 5000,
				icon: <ShieldAlert className="h-4 w-4" />,
			});
			return;
		}

		try {
			toast.loading("Updating member role...");
			setIsLoading(true);

			if (!activeOrganization) {
				toast.dismiss();
				toast.error("No active organization selected");
				return;
			}

			const { data, success, error } = await updateMemberRole(
				memberId,
				activeOrganization.id,
				values.role
			);

			if (!success) {
				logger.error("Error updating member role:", error);
				toast.dismiss();
				toast.error(
					(error as string) || "Failed to update member role"
				);
				return;
			}

			if (data) {
				const updatedMemberUser = await getUser(data.userId);

				if (updatedMemberUser?.data) {
					updateMember({
						...data,
						user: updatedMemberUser.data as MemberUser,
					});
				}
			}

			toast.dismiss();
			toast.success("Member role updated successfully", {
				description: `${values.email} is now ${values.role === "admin" ? "an" : "a"} ${values.role}`,
				icon: <ShieldCheck className="h-4 w-4" />,
			});

			onSuccess();
		} catch (error) {
			logger.error("Failed to update member role", error);
			toast.dismiss();
			toast.error("Failed to update member role");
		} finally {
			setIsLoading(false);
		}
	}

	// Show permission alert if user cannot update roles
	if (!canUpdateRole) {
		return (
			<Alert variant="destructive">
				<ShieldAlert className="h-4 w-4" />
				<AlertDescription>
					Only administrators and owners can update member roles.
					Please contact your workspace admin if you need to change
					member permissions.
				</AlertDescription>
			</Alert>
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
								<Input
									placeholder="example@mail.com"
									{...field}
									disabled
									className="bg-muted"
								/>
							</FormControl>
							<FormDescription>
								Email address cannot be changed
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
								disabled={isLoading}
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

				<Alert>
					<ShieldAlert className="h-4 w-4" />
					<AlertDescription>
						{`Changing a member's role will immediately affect their
						permissions and access to workspace features.`}
					</AlertDescription>
				</Alert>

				<DialogFooter>
					<Button
						disabled={isLoading || !canUpdateRole}
						type="submit"
						className="w-full sm:w-auto"
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Updating Role...
							</>
						) : (
							<>
								<ShieldCheck className="mr-2 h-4 w-4" />
								Update Role
							</>
						)}
					</Button>
				</DialogFooter>
			</form>
		</Form>
	);
}
