"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaybooks } from "@/hooks/use-playbooks";
import { PlaybookWithItems } from "@/types/audit";
import { formatCurrency, formatSize } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
	GOOGLE: "Google Workspace",
	SLACK: "Slack",
	DROPBOX: "Dropbox",
	NOTION: "Notion",
	MICROSOFT: "Microsoft 365",
	FIGMA: "Figma",
	JIRA: "Jira",
};

const SOURCE_TINTS: Record<string, string> = {
	GOOGLE: "bg-[#DDF35B] text-ink",
	SLACK: "bg-[#B9A9D6] text-ink",
	DROPBOX: "bg-[#8FA9A8] text-ink",
	NOTION: "bg-[#F4B183] text-ink",
	MICROSOFT: "bg-[#E4DDF1] text-ink",
	FIGMA: "bg-[#F4B183] text-ink",
	JIRA: "bg-[#8FA9A8] text-ink",
};

const IMPACT_STYLES: Record<string, { label: string; className: string }> = {
	SAVINGS: { label: "Savings", className: "bg-ink text-paper" },
	SECURITY: { label: "Security", className: "bg-[#F4B183] text-ink" },
	EFFICIENCY: { label: "Efficiency", className: "bg-[#E4DDF1] text-ink" },
};

const STATUS_STYLES: Record<string, string> = {
	PENDING: "border border-border bg-background text-foreground",
	APPROVED: "border border-[#E4DDF1] bg-[#E4DDF1] text-ink",
	EXECUTING: "border border-[#B9A9D6] bg-[#B9A9D6] text-ink",
	EXECUTED: "border border-lime bg-lime text-ink",
	FAILED: "border border-[#F4B183] bg-[#F4B183] text-ink",
	DISMISSED: "border border-border bg-muted text-muted-foreground",
};

function titleCase(value: string) {
	return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatTimestamp(value: Date | string | null | undefined) {
	if (!value) return "an unknown date";
	return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

function relativeDate(value: unknown) {
	if (!value) return "Unknown";

	const date = new Date(value as string | Date);
	if (Number.isNaN(date.getTime())) return "Unknown";

	return formatDistanceToNow(date, { addSuffix: true });
}

function metadataFor(metadata: unknown) {
	if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
		return {} as Record<string, unknown>;
	}

	return metadata as Record<string, unknown>;
}

export default function PlaybookDetailPage() {
	const params = useParams();
	const router = useRouter();
	const {
		dismissPlaybook,
		executePlaybook,
		isExecuting,
		subscriptionTier,
	} = usePlaybooks();

	const [playbook, setPlaybook] = useState<PlaybookWithItems | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showExecuteDialog, setShowExecuteDialog] = useState(false);
	const [showDismissDialog, setShowDismissDialog] = useState(false);
	const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

	useEffect(() => {
		const fetchPlaybook = async () => {
			try {
				setIsLoading(true);
				setError(null);

				const response = await fetch(`/api/playbooks/${params.id}`);
				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to fetch playbook");
				}

				const nextPlaybook = data?.playbook as PlaybookWithItems;
				setPlaybook(nextPlaybook);

				if (nextPlaybook?.items) {
					setSelectedItems(
						new Set(
							nextPlaybook.items
								.filter((item) => item.isSelected)
								.map((item) => item.id)
						)
					);
				}
			} catch (fetchError) {
				const message =
					(fetchError as Error).message || "Failed to fetch playbook";
				setError(message);
				toast.error(message);
			} finally {
				setIsLoading(false);
			}
		};

		if (params.id) {
			fetchPlaybook();
		}
	}, [params.id]);

	const saveSelection = async () => {
		if (!playbook) return;

		const response = await fetch(`/api/playbooks/${playbook.id}/items`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				selectedItemIds: Array.from(selectedItems),
			}),
		});

		if (!response.ok) {
			const data = await response.json().catch(() => null);
			throw new Error(data?.error || "Failed to save your selection");
		}
	};

	const handleExecute = async () => {
		if (!playbook) return;

		try {
			await saveSelection();
		} catch (saveError) {
			toast.error((saveError as Error).message);
			return;
		}

		try {
			await executePlaybook(playbook.id);
			setShowExecuteDialog(false);
			router.push("/dashboard/playbooks");
		} catch {
			// Error handled by hook
		}
	};

	const handleDismiss = async () => {
		if (!playbook) return;

		try {
			await dismissPlaybook(playbook.id);
			setShowDismissDialog(false);
			router.push("/dashboard/playbooks");
		} catch {
			// Error handled by hook
		}
	};

	const toggleItem = (itemId: string) => {
		setSelectedItems((previous) => {
			const next = new Set(previous);
			if (next.has(itemId)) {
				next.delete(itemId);
			} else {
				next.add(itemId);
			}
			return next;
		});
	};

	const toggleAll = () => {
		if (!playbook?.items) return;

		if (selectedItems.size === playbook.items.length) {
			setSelectedItems(new Set());
		} else {
			setSelectedItems(new Set(playbook.items.map((item) => item.id)));
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-6 p-6 md:p-8">
				<Skeleton className="h-5 w-32" />
				<Skeleton className="h-[280px] rounded-xl bg-background" />
				<div className="flex flex-col gap-5 lg:flex-row">
					<Skeleton className="h-[460px] flex-[2] rounded-md bg-background" />
					<Skeleton className="h-[280px] rounded-md bg-background lg:max-w-[420px] lg:flex-1" />
				</div>
			</div>
		);
	}

	if (error || !playbook) {
		return (
			<div className="space-y-6 p-6 md:p-8">
				<Link
					href="/dashboard/playbooks"
					className="inline-block text-sm font-medium text-muted-foreground transition-opacity hover:opacity-70"
				>
					← All playbooks
				</Link>
				<div className="flex items-center gap-3 rounded-md border border-border bg-background px-5 py-4">
					<span className="size-2.5 rounded-full bg-[#F4B183]" />
					<p className="text-sm">{error || "Playbook not found"}</p>
				</div>
			</div>
		);
	}

	const items = playbook.items ?? [];
	const selectedCount = selectedItems.size;
	const allSelected = items.length > 0 && selectedCount === items.length;
	const canExecute =
		playbook.status === "PENDING" || playbook.status === "APPROVED";
	const isFreePlan = subscriptionTier.toLowerCase() === "free";
	const isExecutingThis = isExecuting === playbook.id;
	const sourceLabel = SOURCE_LABELS[playbook.source] ?? titleCase(playbook.source);
	const sourceTint =
		SOURCE_TINTS[playbook.source] ?? "bg-muted text-foreground";
	const impactStyle =
		IMPACT_STYLES[playbook.impactType] ?? IMPACT_STYLES.EFFICIENCY;
	const statusStyle =
		STATUS_STYLES[playbook.status] ?? STATUS_STYLES.PENDING;
	const statusLabel = titleCase(playbook.status);
	const riskLabel = playbook.riskLevel
		? `${titleCase(playbook.riskLevel)} risk`
		: "Not rated";
	const impactValue =
		playbook.impactType === "SAVINGS" && playbook.estimatedSavings
			? `${formatCurrency(playbook.estimatedSavings)}/yr`
			: playbook.impact;
	const processedCount = playbook.itemsProcessed || items.length;

	return (
		<div className="space-y-6 p-6 md:p-8">
			<Link
				href="/dashboard/playbooks"
				className="inline-block text-sm font-medium text-muted-foreground transition-opacity hover:opacity-70"
			>
				← All playbooks
			</Link>

			<div className="rounded-xl border border-border bg-background p-5 sm:p-7">
				<div className="flex flex-wrap items-center gap-4">
					<span
						className={`flex size-12 shrink-0 items-center justify-center rounded-[12px] text-lg font-semibold ${sourceTint}`}
					>
						{playbook.source.charAt(0)}
					</span>
					<div className="min-w-0 flex-1 basis-[320px]">
						<div className="flex flex-wrap items-center gap-3">
							<h1 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[32px]">
								{playbook.title}
							</h1>
							<span
								className={`rounded-sm px-2.5 py-1 text-xs font-medium ${impactStyle.className}`}
							>
								{impactStyle.label}
							</span>
						</div>
						<div className="mt-1 text-[13px] text-muted-foreground">
							{sourceLabel}
						</div>
					</div>
				</div>

				<p className="mt-4 max-w-[720px] text-muted-foreground">
					{playbook.description}
				</p>

				<div className="mt-6 flex flex-wrap gap-3">
					<div className="min-w-0 flex-1 basis-[160px] rounded-md bg-muted px-4 py-3.5">
						<div className="text-xs text-muted-foreground">
							Estimated impact
						</div>
						<div className="mt-0.5 break-words font-display text-[18px] font-semibold leading-snug tracking-[-0.02em]">
							{impactValue}
						</div>
					</div>
					<div className="min-w-0 flex-1 basis-[160px] rounded-md bg-muted px-4 py-3.5">
						<div className="text-xs text-muted-foreground">
							Items
						</div>
						<div className="mt-0.5 font-display text-[22px] font-semibold tracking-[-0.02em]">
							{items.length}
						</div>
					</div>
					<div className="min-w-0 flex-1 basis-[160px] rounded-md bg-muted px-4 py-3.5">
						<div className="text-xs text-muted-foreground">
							Status
						</div>
						<div className="mt-1">
							<span
								className={`inline-block rounded-sm px-2.5 py-[3px] text-[13px] font-medium ${statusStyle}`}
							>
								{statusLabel}
							</span>
						</div>
					</div>
					<div className="min-w-0 flex-1 basis-[160px] rounded-md bg-muted px-4 py-3.5">
						<div className="text-xs text-muted-foreground">
							Risk level
						</div>
						<div className="mt-1">
							<span className="inline-block rounded-sm border border-border bg-background px-2.5 py-[3px] text-[13px] font-medium">
								{riskLabel}
							</span>
						</div>
					</div>
				</div>
			</div>

			{playbook.status === "EXECUTED" && (
				<div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background px-5 py-4">
					<span className="size-2.5 rounded-full border border-ink bg-lime" />
					<p className="min-w-0 flex-1 basis-[320px] text-sm">
						<span className="font-semibold">
							Executed on {formatTimestamp(playbook.executedAt)}.
						</span>{" "}
						<span className="text-muted-foreground">
							{processedCount} items were processed. You can undo
							this from Audit logs for 30 days.
						</span>
					</p>
					<Link
						href="/dashboard/audit-logs"
						className="inline-flex h-10 items-center rounded-full bg-muted px-[18px] text-[13px] font-semibold transition-opacity hover:opacity-70"
					>
						View logs
					</Link>
				</div>
			)}

			{playbook.status === "DISMISSED" && (
				<div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background px-5 py-4">
					<span className="size-2.5 rounded-full bg-[#B9A9D6]" />
					<p className="min-w-0 flex-1 basis-[320px] text-sm">
						<span className="font-semibold">
							Dismissed on{" "}
							{formatTimestamp(playbook.dismissedAt)}.
						</span>{" "}
						<span className="text-muted-foreground">
							This playbook is hidden from your recommendations. A
							new audit can bring it back.
						</span>
					</p>
				</div>
			)}

			<div className="flex flex-col gap-5 lg:flex-row lg:items-start">
				<div className="min-w-0 flex-[2] basis-[520px] overflow-hidden rounded-md border border-border bg-background">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
						<div>
							<span className="font-display text-[18px] font-semibold">
								Items
							</span>
							<span className="ml-2 text-[13px] text-muted-foreground">
								{selectedCount} of {items.length} selected
							</span>
						</div>
						<button
							type="button"
							onClick={toggleAll}
							className="h-10 rounded-full bg-muted px-[18px] text-[13px] font-semibold text-foreground transition-colors hover:bg-border"
						>
							{allSelected ? "Deselect all" : "Select all"}
						</button>
					</div>

					<div className="max-h-[460px] overflow-y-auto">
						{items.length === 0 ? (
							<div className="px-5 py-12 text-center text-sm text-muted-foreground">
								This playbook has no items to review.
							</div>
						) : (
							items.map((item) => {
								const checked = selectedItems.has(item.id);
								const metadata = metadataFor(item.metadata);
								const owner =
									typeof metadata.ownerEmail === "string" &&
									metadata.ownerEmail
										? metadata.ownerEmail
										: "Unknown owner";
								const size =
									typeof metadata.size === "number"
										? formatSize(metadata.size)
										: "—";

								return (
									<button
										key={item.id}
										type="button"
										role="checkbox"
										aria-checked={checked}
										onClick={() => toggleItem(item.id)}
										className={`flex w-full flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-border px-5 py-3 text-left text-foreground transition-colors last:border-b-0 hover:bg-muted/60 ${
											checked ? "bg-muted" : "bg-background"
										}`}
									>
										<span
											className={`flex size-[22px] shrink-0 items-center justify-center rounded-sm border-[1.5px] border-ink ${
												checked
													? "bg-ink"
													: "bg-background"
											}`}
										>
											<Check
												className={`size-3 ${
													checked
														? "text-lime"
														: "text-transparent"
												}`}
												strokeWidth={3.5}
											/>
										</span>
										<span
											className="min-w-0 flex-1 basis-[200px] truncate text-sm font-semibold"
											title={item.itemName}
										>
											{item.itemName}
										</span>
										<span className="flex flex-wrap gap-1.5">
											<span className="max-w-[180px] truncate rounded-sm bg-muted px-2.5 py-1 text-xs text-muted-foreground">
												{owner}
											</span>
											<span className="rounded-sm bg-muted px-2.5 py-1 text-xs text-muted-foreground">
												{relativeDate(
													metadata.lastAccessed
												)}
											</span>
											<span className="rounded-sm bg-muted px-2.5 py-1 text-xs text-muted-foreground">
												{size}
											</span>
										</span>
									</button>
								);
							})
						)}
					</div>
				</div>

				<div className="flex w-full flex-col gap-4 lg:max-w-[420px] lg:flex-1">
					{canExecute ? (
						<div className="flex flex-col gap-3 rounded-md border border-border bg-background p-5">
							<div className="font-display text-[18px] font-semibold">
								Actions
							</div>
							<div className="text-[13px] text-muted-foreground">
								{selectedCount} of {items.length} items selected
							</div>

							{isFreePlan ? (
								<div className="rounded-md bg-night p-[18px] text-paper">
									<div className="font-display text-[18px] font-semibold">
										Upgrade to execute
									</div>
									<p className="mt-1.5 text-[13px] text-[#A8A8A2]">
										Running playbooks is available on paid
										plans. You can still review every item
										and dismiss this playbook.
									</p>
									<Link
										href="/dashboard/settings/billing"
										className="mt-3.5 inline-flex h-11 items-center rounded-full bg-lime px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-85"
									>
										Upgrade plan
									</Link>
								</div>
							) : (
								<Button
									onClick={() =>
										setShowExecuteDialog(true)
									}
									disabled={
										selectedCount === 0 || isExecutingThis
									}
									className="h-12 rounded-full text-[15px] font-semibold"
								>
									{isExecutingThis ? (
										<>
											<Loader2 className="size-4 animate-spin" />
											Executing...
										</>
									) : (
										"Execute playbook"
									)}
								</Button>
							)}

							<Button
								variant="outline"
								onClick={() => setShowDismissDialog(true)}
								className="h-12 rounded-full border-border bg-background text-[15px] font-semibold"
							>
								Dismiss
							</Button>
						</div>
					) : (
						<div className="rounded-md border border-border bg-background p-5 text-sm text-muted-foreground">
							<span className="font-semibold text-foreground">
								No actions available.
							</span>{" "}
							This playbook is {playbook.status.toLowerCase()}.
						</div>
					)}
				</div>
			</div>

			<Dialog
				open={showExecuteDialog}
				onOpenChange={setShowExecuteDialog}
			>
				<DialogContent
					showCloseButton={false}
					className="max-w-[460px] gap-0 rounded-xl border-border p-7"
				>
					<DialogHeader className="gap-0">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Execute this playbook?
						</DialogTitle>
						<DialogDescription className="mt-2.5 text-sm text-muted-foreground">
							This will apply the playbook to {selectedCount}{" "}
							selected items in {sourceLabel}.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-4 flex gap-3 rounded-md bg-muted px-4 py-3.5 text-[13px]">
						<span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#F4B183]" />
						<p>
							<span className="font-semibold">
								This is irreversible after 30 days.
							</span>{" "}
							<span className="text-muted-foreground">
								Until then you can restore items from Audit
								logs.
							</span>
						</p>
					</div>

					<div className="mt-6 flex flex-wrap justify-end gap-3">
						<Button
							variant="secondary"
							onClick={() => setShowExecuteDialog(false)}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							Cancel
						</Button>
						<Button
							onClick={handleExecute}
							disabled={isExecutingThis}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							{isExecutingThis ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Executing...
								</>
							) : (
								`Execute ${selectedCount} items`
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={showDismissDialog}
				onOpenChange={setShowDismissDialog}
			>
				<DialogContent
					showCloseButton={false}
					className="max-w-[460px] gap-0 rounded-xl border-border p-7"
				>
					<DialogHeader className="gap-0">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Dismiss this playbook?
						</DialogTitle>
						<DialogDescription className="mt-2.5 text-sm text-muted-foreground">
							It will be hidden from your recommendations and
							nothing will change in your tools. Run a new audit to
							bring it back.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-6 flex flex-wrap justify-end gap-3">
						<Button
							variant="secondary"
							onClick={() => setShowDismissDialog(false)}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							Cancel
						</Button>
						<Button
							onClick={handleDismiss}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							Dismiss playbook
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
