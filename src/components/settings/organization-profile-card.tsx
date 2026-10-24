"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Organization } from "@prisma/client";

interface OrganizationProfileCardProps {
	organization: Organization;
	isAdmin: boolean;
	memberCount: number;
	planLabel: string;
	onEdit: () => void;
	onChangeLogo: () => void;
}

export function OrganizationProfileCard({
	organization,
	isAdmin,
	memberCount,
	planLabel,
	onEdit,
	onChangeLogo,
}: OrganizationProfileCardProps) {
	const initial = organization.name.charAt(0).toUpperCase();
	const createdDate = format(new Date(organization.createdAt), "MMM yyyy");

	return (
		<div className="rounded-xl border border-border bg-background p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">
					Workspace profile
				</h2>
				<span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
					{planLabel}
				</span>
			</div>

			<div className="mt-5 flex flex-wrap items-center gap-5">
				<span className="flex size-[72px] shrink-0 items-center justify-center rounded-2xl bg-ink font-display text-[28px] font-semibold text-paper">
					{initial}
				</span>

				<div className="min-w-0 flex-1 basis-[280px]">
					<div className="text-[13px] text-muted-foreground">
						Workspace name
					</div>
					<div className="truncate font-display text-[26px] font-semibold leading-tight tracking-[-0.02em]">
						{organization.name}
					</div>
					<div className="mt-0.5 text-[13px] text-muted-foreground">
						Created {createdDate} · {memberCount}{" "}
						{memberCount === 1 ? "member" : "members"}
					</div>
				</div>

				{isAdmin && (
					<div className="flex flex-wrap gap-2.5">
						<Button
							variant="secondary"
							onClick={onChangeLogo}
							className="h-11 rounded-full px-5 text-sm font-semibold"
						>
							Change logo
						</Button>
						<Button
							onClick={onEdit}
							className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink/90"
						>
							Edit workspace
						</Button>
					</div>
				)}
			</div>

			{!isAdmin && (
				<div className="mt-4 rounded-xl bg-muted px-4 py-3 text-[13px] text-muted-foreground">
					Only workspace admins can edit or delete this workspace.
				</div>
			)}
		</div>
	);
}
