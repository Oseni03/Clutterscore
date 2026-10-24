"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
	GOOGLE: "Google",
	SLACK: "Slack",
	DROPBOX: "Dropbox",
	NOTION: "Notion",
	MICROSOFT: "Microsoft",
	FIGMA: "Figma",
	JIRA: "Jira",
};

function formatGb(sizeGb: number) {
	if (sizeGb >= 1024) return `${(sizeGb / 1024).toFixed(1)} TB`;
	if (sizeGb < 1) return `${(sizeGb * 1024).toFixed(0)} MB`;
	return `${sizeGb.toFixed(1)} GB`;
}

interface StorageSuggestionsProps {
	wastedStorageGb: number;
	duplicateCount: number;
	publicCount: number;
	largestWaster: {
		type: string;
		sizeGb: number;
		source: string | null;
	};
}

export default function StorageSuggestions({
	wastedStorageGb,
	duplicateCount,
	publicCount,
	largestWaster,
}: StorageSuggestionsProps) {
	const annualSavings = Math.round(wastedStorageGb * 0.1 * 12);
	const sourceLabel = largestWaster.source
		? (SOURCE_LABELS[largestWaster.source] ?? largestWaster.source)
		: "multiple sources";

	const suggestions = [
		{
			title: "Archive your largest waster",
			description: `${largestWaster.type} files unused for over a year make up ${formatGb(largestWaster.sizeGb)} across ${sourceLabel}.`,
			action: "Open playbook",
			href: "/dashboard/playbooks",
		},
		{
			title: "Remove duplicates",
			description: `${duplicateCount.toLocaleString()} duplicate ${duplicateCount === 1 ? "file is" : "files are"} counting toward your quota.`,
			action: "Review duplicates",
			href: "/dashboard/files?isDuplicate=true",
		},
		{
			title: "Review public files",
			description: `${publicCount.toLocaleString()} ${publicCount === 1 ? "file is" : "files are"} open to anyone with the link.`,
			action: "Review public files",
			href: "/dashboard/files?isPublic=true",
		},
	];

	return (
		<div className="rounded-2xl bg-night p-6 text-paper sm:p-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<div className="text-[13px] font-medium text-[#A8A8A2]">
						Suggestions
					</div>
					<div className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
						Potential annual savings{" "}
						<span className="mt-1 inline-block rounded-xl bg-lime px-3 text-ink sm:mt-0">
							{formatCurrency(annualSavings)}
						</span>
					</div>
				</div>
			</div>

			<div className="mt-6 grid gap-4 md:grid-cols-3">
				{suggestions.map((suggestion) => (
					<div
						key={suggestion.title}
						className="flex flex-col gap-2 rounded-xl bg-[#1F1F1F] p-5"
					>
						<div className="font-display text-lg font-semibold">
							{suggestion.title}
						</div>
						<p className="flex-1 text-sm text-[#A8A8A2]">
							{suggestion.description}
						</p>
						<Link
							href={suggestion.href}
							className="text-sm font-semibold text-lime transition-opacity hover:opacity-75"
						>
							{suggestion.action} →
						</Link>
					</div>
				))}
			</div>
		</div>
	);
}
