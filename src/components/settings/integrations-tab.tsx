"use client";

import { useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useIntegrations } from "@/hooks/use-integrations";
import { useConnectorSync } from "@/hooks/use-connector-sync";
import { getPlanByTier } from "@/lib/subscription-plans";
import { ToolSource } from "@prisma/client";
import { logger } from "@/lib/logger";

const SOURCE_NAMES: Record<ToolSource, string> = {
	SLACK: "Slack",
	GOOGLE: "Google Workspace",
	MICROSOFT: "Microsoft 365",
	NOTION: "Notion",
	DROPBOX: "Dropbox",
	FIGMA: "Figma",
	JIRA: "Jira",
};

const SOURCE_DESCRIPTIONS: Record<ToolSource, string> = {
	SLACK: "Channels and members",
	GOOGLE: "Drive files, users and sharing",
	MICROSOFT: "OneDrive, SharePoint, and users",
	NOTION: "Pages and workspace members",
	DROPBOX: "Files and folders",
	FIGMA: "Design files and projects",
	JIRA: "Users and projects",
};

const SOURCE_BRANDS: Record<
	ToolSource,
	{ initial: string; className: string }
> = {
	GOOGLE: { initial: "G", className: "bg-lime text-ink" },
	SLACK: { initial: "S", className: "bg-[#B9A9D6] text-ink" },
	DROPBOX: { initial: "D", className: "bg-[#8FA9A8] text-ink" },
	NOTION: { initial: "N", className: "bg-[#F4B183] text-ink" },
	MICROSOFT: { initial: "M", className: "bg-muted text-foreground" },
	FIGMA: { initial: "F", className: "bg-muted text-foreground" },
	JIRA: { initial: "J", className: "bg-muted text-foreground" },
};

const AVAILABLE_SOURCES: ToolSource[] = [
	"GOOGLE",
	"SLACK",
	"DROPBOX",
	"NOTION",
];

function relativeTime(value: Date | string | null) {
	if (!value) return "never";

	const diff = Date.now() - new Date(value).getTime();
	const minutes = Math.floor(diff / 60000);

	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes} min ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

	const days = Math.floor(hours / 24);
	if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

	return new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export default function IntegrationsTab() {
	const {
		integrations,
		isLoading,
		error,
		subscriptionTier,
		connectIntegration,
		disconnectIntegration,
		refreshToken,
		registerWebhook,
		unregisterWebhook,
		refetch,
		integrationLimit,
	} = useIntegrations();

	const { syncIntegration, isSyncing } = useConnectorSync();

	const [manageSource, setManageSource] = useState<ToolSource | null>(null);
	const [disconnectOpen, setDisconnectOpen] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [autoSync, setAutoSync] = useState<
		Partial<Record<ToolSource, boolean>>
	>({});

	const getIntegrationBySource = (source: ToolSource) => {
		return integrations.find((item) => item.source === source && item.isActive);
	};

	const activeCount = integrations.filter((item) => item.isActive).length;
	const extraConnectedSources = Object.values(ToolSource).filter(
		(source) =>
			!AVAILABLE_SOURCES.includes(source) &&
			!!getIntegrationBySource(source)
	);
	const displaySources = [...AVAILABLE_SOURCES, ...extraConnectedSources];
	const plan = getPlanByTier(subscriptionTier);
	const planLabel = plan.id === "free" ? "Free plan" : plan.name;
	const selectedIntegration = manageSource
		? getIntegrationBySource(manageSource)
		: null;
	const selectedName = manageSource ? SOURCE_NAMES[manageSource] : "";

	const handleSync = async (source: ToolSource) => {
		setActionLoading("sync");
		try {
			await syncIntegration(source, refetch);
		} catch (error) {
			logger.error("Sync error:", error);
		} finally {
			setActionLoading(null);
		}
	};

	const handleRefreshToken = async (source: ToolSource) => {
		setActionLoading("refresh");
		try {
			await refreshToken(source);
		} catch (error) {
			logger.error("Refresh token error:", error);
		} finally {
			setActionLoading(null);
		}
	};

	const handleDisconnect = async () => {
		if (!manageSource) return;

		setActionLoading("disconnect");
		try {
			await disconnectIntegration(manageSource);
			setDisconnectOpen(false);
			setManageSource(null);
		} catch (error) {
			logger.error("Disconnect error:", error);
		} finally {
			setActionLoading(null);
		}
	};

	const handleWebhookToggle = async (
		source: ToolSource,
		checked: boolean
	) => {
		setActionLoading("webhook");
		try {
			if (checked) {
				await registerWebhook(source);
			} else {
				await unregisterWebhook(source);
			}
		} catch (error) {
			logger.error("Webhook update error:", error);
		} finally {
			setActionLoading(null);
		}
	};

	if (isLoading) {
		return (
			<div className="overflow-hidden rounded-xl border border-border bg-background">
				<div className="border-b border-border p-5">
					<Skeleton className="h-7 w-44" />
					<Skeleton className="mt-2 h-4 w-72" />
				</div>
				{Array.from({ length: 4 }).map((_, index) => (
					<div
						key={index}
						className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-4 last:border-0"
					>
						<Skeleton className="size-11 rounded-xl" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="h-3.5 w-56" />
						</div>
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-10 w-24 rounded-full" />
					</div>
				))}
			</div>
		);
	}

	return (
		<>
			{error && (
				<div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-4">
					<span className="size-2.5 rounded-full bg-[#F4B183]" />
					<p className="text-sm">{error}</p>
				</div>
			)}

			<div className="overflow-hidden rounded-xl border border-border bg-background">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
					<div>
						<h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">
							Connected Apps
						</h2>
						<p className="text-[13px] text-muted-foreground">
							{integrationLimit !== null
								? `${planLabel}: ${activeCount} of ${integrationLimit} active integrations used.`
								: `${planLabel}: ${activeCount} active integration${
										activeCount === 1 ? "" : "s"
									}.`}
						</p>
					</div>
				</div>

				{displaySources.map((source) => {
					const integration = getIntegrationBySource(source);
					const connected = !!integration;
					const status = integration?.syncStatus ?? "IDLE";
					const brand = SOURCE_BRANDS[source];

					const statusLabel = !connected
						? "Not connected"
						: status === "SYNCING"
							? "Syncing"
							: status === "ERROR"
								? "Error"
								: "Active";

					const detail = !connected
						? SOURCE_DESCRIPTIONS[source]
						: status === "ERROR"
							? `Sync failed.${
									integration?.lastSyncedAt
										? ` Last synced ${relativeTime(integration.lastSyncedAt)}.`
										: ""
								}`
							: status === "SYNCING"
								? "Syncing now"
								: integration?.lastSyncedAt
									? `Last synced ${relativeTime(integration.lastSyncedAt)}`
									: "Ready to sync";

					const dotClass = !connected
						? "bg-border"
						: status === "ERROR"
							? "bg-[#F4B183]"
							: status === "SYNCING"
								? "bg-lime"
								: "bg-[#8FA9A8]";

					return (
						<div
							key={source}
							className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-[18px] last:border-0"
						>
							<span
								className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${brand.className}`}
							>
								{brand.initial}
							</span>

							<div className="min-w-0 flex-1 basis-[280px]">
								<div className="text-[15px] font-semibold">
									{SOURCE_NAMES[source]}
								</div>
								<div className="truncate text-[13px] text-muted-foreground">
									{detail}
								</div>
							</div>

							<div className="flex min-w-[110px] items-center gap-2 text-[13px] font-medium">
								<span
									className={`size-2.5 rounded-full ${dotClass}`}
								/>
								{statusLabel}
							</div>

							<Button
								onClick={() => {
									if (connected) {
										setManageSource(source);
									} else {
										connectIntegration(source);
									}
								}}
								variant={connected ? "secondary" : "default"}
								className={`h-10 rounded-full px-5 text-sm font-semibold ${
									connected
										? "bg-muted text-ink hover:bg-border"
										: "bg-ink text-paper hover:bg-ink/90"
								}`}
							>
								{connected ? "Manage" : "Connect"}
							</Button>
						</div>
					);
				})}
			</div>

			<Dialog
				open={!!manageSource}
				onOpenChange={(open) => {
					if (!open) setManageSource(null);
				}}
			>
				<DialogContent
					showCloseButton={false}
					className="max-w-[520px] gap-0 rounded-2xl p-7"
				>
					<DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 text-left">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Manage {selectedName}
						</DialogTitle>
						<DialogDescription className="sr-only">
							Manage the {selectedName} integration.
						</DialogDescription>
						<button
							type="button"
							onClick={() => setManageSource(null)}
							aria-label="Close"
							className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-border"
						>
							<X className="size-[18px]" />
						</button>
					</DialogHeader>

					{selectedIntegration && manageSource && (
						<>
							<div
								className={`mt-5 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5 ${
									selectedIntegration.syncStatus === "ERROR"
										? "bg-[#FBE3D2]"
										: "bg-muted"
								}`}
							>
								<span
									className={`size-2.5 rounded-full ${
										selectedIntegration.syncStatus ===
										"ERROR"
											? "bg-[#F4B183]"
											: "bg-[#8FA9A8]"
									}`}
								/>
								<div className="min-w-0 flex-1 basis-[200px] text-sm">
									<span className="font-semibold">
										{selectedIntegration.syncStatus ===
										"ERROR"
											? "Connection error."
											: "Connection active."}
									</span>{" "}
									<span className="text-muted-foreground">
										{selectedIntegration.syncStatus ===
										"ERROR"
											? selectedIntegration.lastError ||
												"The last sync failed. Retry or reconnect."
											: selectedIntegration.lastSyncedAt
												? `Last synced ${relativeTime(
														selectedIntegration.lastSyncedAt
													)}.`
												: "Not synced yet."}
									</span>
								</div>
								{selectedIntegration.syncStatus ===
									"ERROR" && (
									<Button
										onClick={() =>
											handleRefreshToken(manageSource)
										}
										disabled={
											actionLoading === "refresh"
										}
										className="h-9 rounded-full bg-ink px-4 text-[13px] font-semibold text-paper hover:bg-ink/90"
									>
										{actionLoading === "refresh" ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<RefreshCw className="size-3.5" />
										)}
										Retry
									</Button>
								)}
							</div>

							<div className="mt-5">
								<div className="text-[13px] font-medium text-muted-foreground">
									Granted scopes
								</div>
								<div className="mt-2 flex flex-wrap gap-2">
									{selectedIntegration.scopes?.length ? (
										selectedIntegration.scopes.map(
											(scope) => (
												<span
													key={scope}
													className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
												>
													{scope}
												</span>
											)
										)
									) : (
										<span className="text-[13px] text-muted-foreground">
											No scopes recorded.
										</span>
									)}
								</div>
							</div>

							{["GOOGLE", "MICROSOFT"].includes(manageSource) && (
								<div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4">
									<div>
										<div className="text-sm font-semibold">
											Webhooks
										</div>
										<div className="text-[13px] text-muted-foreground">
											Get change events so audits stay
											current.
										</div>
									</div>
									<Switch
										checked={Boolean(
											selectedIntegration.metadata
												?.webhook
										)}
										onCheckedChange={(checked) =>
											handleWebhookToggle(
												manageSource,
												checked
											)
										}
										disabled={actionLoading === "webhook"}
										aria-label="Webhooks"
									/>
								</div>
							)}

							<div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
								<div>
									<div className="text-sm font-semibold">
										Auto-sync
									</div>
									<div className="text-[13px] text-muted-foreground">
										Sync this app automatically every day.
									</div>
								</div>
								<Switch
									checked={autoSync[manageSource] ?? true}
									onCheckedChange={(checked) =>
										setAutoSync((current) => ({
											...current,
											[manageSource]: checked,
										}))
									}
									aria-label="Auto-sync"
								/>
							</div>

							<div className="mt-6 flex flex-wrap justify-between gap-3">
								<Button
									variant="outline"
									onClick={() => setDisconnectOpen(true)}
									disabled={actionLoading === "disconnect"}
									className="h-11 rounded-full border-border bg-background px-5 text-sm font-semibold"
								>
									Disconnect
								</Button>
								<Button
									onClick={() => handleSync(manageSource)}
									disabled={
										isSyncing ||
										actionLoading === "sync" ||
										selectedIntegration.syncStatus ===
											"SYNCING"
									}
									className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink/90"
								>
									{isSyncing ||
									actionLoading === "sync" ||
									selectedIntegration.syncStatus ===
										"SYNCING" ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<RefreshCw className="size-4" />
									)}
									Sync now
								</Button>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
				<DialogContent
					showCloseButton={false}
					className="max-w-[460px] gap-0 rounded-2xl p-7"
				>
					<DialogHeader className="gap-0 text-left">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Disconnect {selectedName}?
						</DialogTitle>
						<DialogDescription className="mt-2.5 text-sm text-muted-foreground">
							Clutterscore will stop syncing and auditing this
							app. Your past audits and logs are kept. You can
							reconnect anytime.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-6 flex flex-wrap justify-end gap-3">
						<Button
							variant="secondary"
							onClick={() => setDisconnectOpen(false)}
							disabled={actionLoading === "disconnect"}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							Cancel
						</Button>
						<Button
							onClick={handleDisconnect}
							disabled={actionLoading === "disconnect"}
							className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-paper hover:bg-ink/90"
						>
							{actionLoading === "disconnect" && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Disconnect
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
