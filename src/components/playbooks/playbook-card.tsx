"use client";

import {
	ImpactType,
	PlaybookStatus,
	RiskLevel,
	ToolSource,
} from "@prisma/client";

interface PlaybookCardProps {
	title: string;
	description: string;
	impactType: ImpactType;
	source: ToolSource;
	itemsCount: number;
	status?: PlaybookStatus;
	riskLevel?: RiskLevel | null;
	onAction?: () => void;
}

const SOURCE_TINT: Record<string, string> = {
	GOOGLE: "bg-[#DDF35B] text-ink",
	SLACK: "bg-[#B9A9D6] text-ink",
	DROPBOX: "bg-[#8FA9A8] text-ink",
	NOTION: "bg-[#F4B183] text-ink",
	MICROSOFT: "bg-[#E4DDF1] text-ink",
	FIGMA: "bg-[#F4B183] text-ink",
	JIRA: "bg-[#8FA9A8] text-ink",
};

const RISK_TINT: Record<string, string> = {
	CRITICAL: "bg-[#F4B183] text-ink",
	HIGH: "bg-[#F4B183] text-ink",
	MEDIUM: "bg-[#E4DDF1] text-ink",
	LOW: "bg-muted text-muted-foreground",
};

const STATUS_TINT: Record<string, string> = {
	PENDING: "border border-border bg-background text-foreground",
	APPROVED: "bg-[#E4DDF1] text-ink",
	EXECUTING: "bg-[#B9A9D6] text-ink",
	EXECUTED: "bg-lime text-ink",
	FAILED: "bg-[#F4B183] text-ink",
	DISMISSED: "bg-muted text-muted-foreground",
};

function titleCase(value: string) {
	return value.charAt(0) + value.slice(1).toLowerCase();
}

export function PlaybookCard({
	title,
	description,
	impactType,
	source,
	itemsCount,
	status = "PENDING",
	riskLevel,
	onAction,
}: PlaybookCardProps) {
	const sourceTint = SOURCE_TINT[source] ?? "bg-muted text-foreground";
	const risk = riskLevel ?? "LOW";
	const riskTint = RISK_TINT[risk] ?? RISK_TINT.LOW;
	const statusTint = STATUS_TINT[status] ?? STATUS_TINT.PENDING;

	return (
		<button
			type="button"
			onClick={onAction}
			className="flex w-full flex-col gap-3 rounded-md border border-border bg-background p-5 text-left text-foreground transition-colors hover:bg-muted/40"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<span className="flex items-center gap-2 text-[13px] font-medium">
					<span
						className={`flex size-7 items-center justify-center rounded-[8px] text-[13px] font-semibold ${sourceTint}`}
					>
						{source.charAt(0)}
					</span>
					<span className="capitalize">{source.toLowerCase()}</span>
				</span>
				<span className="text-xs font-medium text-muted-foreground">
					{titleCase(impactType)}
				</span>
			</div>

			<h3 className="font-display text-[20px] font-semibold leading-[1.2] tracking-[-0.02em]">
				{title}
			</h3>
			<p className="flex-1 text-sm text-muted-foreground">
				{description}
			</p>

			<div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
				<span className="mr-auto text-[13px] font-semibold">
					{itemsCount} {itemsCount === 1 ? "item" : "items"}
				</span>
				<span
					className={`rounded-sm px-2.5 py-1 text-xs font-medium ${riskTint}`}
				>
					{titleCase(risk)} risk
				</span>
				<span
					className={`rounded-sm px-2.5 py-1 text-xs font-medium ${statusTint}`}
				>
					{titleCase(status)}
				</span>
			</div>
		</button>
	);
}
