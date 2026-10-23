"use client";

import Link from "next/link";
import { Check } from "lucide-react";

interface SubscriptionDetailsCardProps {
	planLabel: string;
	isFree: boolean;
}

export function SubscriptionDetailsCard({
	planLabel,
	isFree,
}: SubscriptionDetailsCardProps) {
	const features = [
		{ label: "Up to 3 integrations", on: true },
		{ label: "ClutterScore and waste estimate", on: true },
		{ label: "Approve-first playbooks", on: true },
		{ label: "Execute playbooks", on: !isFree },
		{ label: "Unlimited audits", on: !isFree },
		{ label: "More members", on: !isFree },
	];

	return (
		<div className="rounded-xl border border-border bg-background p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">
						Subscription
					</h2>
					<p className="text-[13px] text-muted-foreground">
						You are on the {planLabel} plan.
					</p>
				</div>
				<Link
					href="/dashboard/settings/billing"
					className="inline-flex min-h-11 items-center rounded-full bg-lime px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-85"
				>
					{isFree ? "Upgrade plan" : "Manage plan"}
				</Link>
			</div>

			<div className="mt-5 flex flex-wrap gap-3">
				{features.map((feature) => (
					<div
						key={feature.label}
						className="flex flex-1 basis-[200px] items-center gap-3 rounded-xl bg-muted px-4 py-3.5 text-sm"
					>
						<span
							className={`flex size-[18px] shrink-0 items-center justify-center rounded-md ${
								feature.on ? "bg-ink" : "bg-border"
							}`}
						>
							<Check
								className={`size-3 ${
									feature.on
										? "text-lime"
										: "text-transparent"
								}`}
								strokeWidth={3.5}
							/>
						</span>
						<span
							className={
								feature.on ? "" : "text-muted-foreground"
							}
						>
							{feature.label}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
