"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AccountHeader } from "@/components/account/account-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

export default function AccountSettingsPage() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [name, setName] = useState("");

	useEffect(() => {
		if (!isEditing) {
			setName(user?.name ?? "");
		}
	}, [isEditing, user?.name]);

	const startEditing = () => {
		setName(user?.name ?? "");
		setIsEditing(true);
	};

	const cancelEditing = () => {
		setName(user?.name ?? "");
		setIsEditing(false);
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const nextName = name.trim();

		if (nextName.length < 2) {
			toast.error("Name must be at least 2 characters");
			return;
		}

		setIsSaving(true);

		try {
			const result = await authClient.updateUser({ name: nextName });

			if (result.error) {
				throw new Error(result.error.message || "Failed to update profile");
			}

			await authClient.getSession();
			setName(nextName);
			setIsEditing(false);
			toast.success("Profile updated");
		} catch (error) {
			logger.error("UPDATE_PROFILE_ERROR: ", error);
			toast.error("Failed to update profile");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<AccountHeader
				active="profile"
				title="Account Settings"
				subtitle="Manage your personal profile and preferences. These settings apply only to you, not to your workspace."
			/>

			<section className="rounded-2xl border border-border bg-background p-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<h2 className="font-display text-[22px] font-semibold tracking-[-0.03em]">
						User profile
					</h2>
					{user && (
						<Button
							type="button"
							variant={isEditing ? "secondary" : "default"}
							size="sm"
							className="h-10 px-5"
							onClick={isEditing ? cancelEditing : startEditing}
						>
							{isEditing ? "Close" : "Edit Profile"}
						</Button>
					)}
				</div>

				{isPending ? (
					<div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
						<Skeleton className="size-[72px] shrink-0 rounded-full" />
						<div className="w-full max-w-md space-y-5">
							<div className="space-y-2">
								<Skeleton className="h-3 w-16" />
								<Skeleton className="h-6 w-48" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-3 w-16" />
								<Skeleton className="h-5 w-64" />
							</div>
						</div>
					</div>
				) : !user ? (
					<p className="mt-6 text-sm text-muted-foreground">
						No profile data available.
					</p>
				) : (
					<div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
						<div
							aria-hidden="true"
							className="size-[72px] shrink-0 rounded-full bg-orb"
						/>

						<div className="min-w-0 flex-1">
							{isEditing ? (
								<form
									onSubmit={handleSubmit}
									className="max-w-md space-y-5"
								>
									<div className="space-y-2">
										<label
											htmlFor="account-name"
											className="text-[13px] font-medium text-graphite"
										>
											Name
										</label>
										<Input
											id="account-name"
											value={name}
											onChange={(event) =>
												setName(event.target.value)
											}
											placeholder="Your name"
											autoComplete="name"
											maxLength={50}
										/>
									</div>

									<div className="space-y-2">
										<label
											htmlFor="account-email"
											className="text-[13px] font-medium text-graphite"
										>
											Email
										</label>
										<Input
											id="account-email"
											value={user.email}
											disabled
											className="bg-muted text-muted-foreground disabled:opacity-100"
										/>
										<p className="text-xs text-muted-foreground">
											Your email is tied to your sign-in and
											cannot be changed here.
										</p>
									</div>

									<div className="flex flex-col gap-2 pt-1 sm:flex-row">
										<Button
											type="submit"
											size="sm"
											className="h-10 px-5"
											disabled={isSaving}
										>
											{isSaving ? "Saving..." : "Save changes"}
										</Button>
										<Button
											type="button"
											variant="secondary"
											size="sm"
											className="h-10 px-5"
											onClick={cancelEditing}
											disabled={isSaving}
										>
											Cancel
										</Button>
									</div>
								</form>
							) : (
								<div className="space-y-5">
									<div>
										<p className="text-[13px] font-medium text-graphite">
											Name
										</p>
										<p className="mt-1 break-words font-display text-2xl font-semibold tracking-[-0.03em]">
											{user.name || "Not provided"}
										</p>
									</div>
									<div>
										<p className="text-[13px] font-medium text-graphite">
											Email
										</p>
										<p className="mt-1 break-all text-base">
											{user.email}
										</p>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</section>
		</div>
	);
}
