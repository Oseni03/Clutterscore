// components/settings/integrations-tab.tsx

"use client";

import React, { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	CheckCircle2,
	RefreshCw,
	Plug,
	Trash2,
	AlertCircle,
	Loader2,
	Webhook,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntegrations } from "@/hooks/use-integrations";
import { useConnectorSync } from "@/hooks/use-connector-sync";
import { ToolSource } from "@prisma/client";
import { toast } from "sonner";
import { logger } from "better-auth";
import { SOURCE_ICONS } from "@/lib/utils";
import Image from "next/image";

const SOURCE_NAMES: Record<ToolSource, string> = {
	SLACK: "Slack",
	GOOGLE: "Google Workspace",
	MICROSOFT: "Microsoft 365",
	NOTION: "Notion",
	DROPBOX: "Dropbox",
	FIGMA: "Figma",
	LINEAR: "Linear",
	JIRA: "Jira",
};

const SOURCE_DESCRIPTIONS: Record<ToolSource, string> = {
	SLACK: "Channels, files, and users",
	GOOGLE: "Drive, users, and groups",
	MICROSOFT: "OneDrive, SharePoint, and users",
	NOTION: "Pages and workspace members",
	DROPBOX: "Files and team members",
	FIGMA: "Design files and projects",
	LINEAR: "Users and teams",
	JIRA: "Users and projects",
};

const AVAILABLE_SOURCES: ToolSource[] = [
	"GOOGLE",
	"SLACK",
	"MICROSOFT",
	"DROPBOX",
	"NOTION",
	"FIGMA",
	"LINEAR",
	"JIRA",
];

export default function IntegrationsTab() {
	const {
		integrations,
		isLoading,
		error,
		connectIntegration,
		disconnectIntegration,
		refreshToken,
		registerWebhook,
	} = useIntegrations();

	const { syncIntegration, isSyncing } = useConnectorSync();

	const [selectedSource, setSelectedSource] = useState<ToolSource | null>(
		null
	);
	const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	const getIntegrationBySource = (source: ToolSource) => {
		return integrations.find((i) => i.source === source && i.isActive);
	};

	const handleSync = async (source: ToolSource) => {
		setActionLoading("sync");
		try {
			await syncIntegration(source);
			toast.success(`${SOURCE_NAMES[source]} synced successfully`);
		} catch (error) {
			logger.error("Sync error:", error);
			// Error already handled by hook
		} finally {
			setActionLoading(null);
		}
	};

	const handleDisconnect = async () => {
		if (!selectedSource) return;

		setActionLoading("disconnect");
		try {
			await disconnectIntegration(selectedSource);
			setShowDisconnectDialog(false);
			setSelectedSource(null);
		} catch (error) {
			logger.error("Disconnect error:", error);
			// Error already handled by hook
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
			// Error already handled by hook
		} finally {
			setActionLoading(null);
		}
	};

	const handleRegisterWebhook = async (source: ToolSource) => {
		setActionLoading("webhook");
		try {
			await registerWebhook(source);
		} catch (error) {
			logger.error("Register webhook error:", error);
			// Error already handled by hook
		} finally {
			setActionLoading(null);
		}
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-96 mt-2" />
				</CardHeader>
				<CardContent className="space-y-4">
					{[1, 2, 3, 4].map((i) => (
						<div
							key={i}
							className="flex items-center justify-between"
						>
							<div className="flex items-center gap-4">
								<Skeleton className="h-10 w-10 rounded-lg" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-24" />
								</div>
							</div>
							<Skeleton className="h-9 w-24" />
						</div>
					))}
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Connected Apps</CardTitle>
				<CardDescription>
					Manage the tools ClutterScore has access to.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{AVAILABLE_SOURCES.map((source) => {
					const integration = getIntegrationBySource(source);
					const isConnected = !!integration;

					return (
						<div
							key={source}
							className="flex items-center justify-between"
						>
							<div className="flex items-center gap-4">
								<div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xl">
									<Image
										src={SOURCE_ICONS[source as ToolSource]}
										alt={`${source} icon`}
										width={20}
										height={20}
									/>
								</div>
								<div>
									<div className="font-medium flex items-center gap-2">
										{SOURCE_NAMES[source]}
										{integration?.syncStatus ===
											"SYNCING" && (
											<Loader2 className="h-3 w-3 animate-spin text-blue-500" />
										)}
										{integration?.syncStatus ===
											"ERROR" && (
											<AlertCircle className="h-3 w-3 text-destructive" />
										)}
									</div>
									<div className="text-xs text-muted-foreground">
										{isConnected
											? integration.lastSyncedAt
												? `Last synced ${new Date(integration.lastSyncedAt).toLocaleString()}`
												: "Never synced"
											: SOURCE_DESCRIPTIONS[source]}
									</div>
								</div>
							</div>

							<Dialog>
								<DialogTrigger asChild>
									<Button
										variant={
											isConnected ? "outline" : "default"
										}
										size="sm"
										onClick={() =>
											setSelectedSource(source)
										}
									>
										{isConnected ? "Manage" : "Connect"}
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle className="flex items-center gap-2">
											<Image
												src={
													SOURCE_ICONS[
														source as ToolSource
													]
												}
												alt={`${source} icon`}
												width={20}
												height={20}
											/>
											{SOURCE_NAMES[source]} Settings
										</DialogTitle>
										<DialogDescription>
											Configure synchronization and
											permission settings for{" "}
											{SOURCE_NAMES[source]}.
										</DialogDescription>
									</DialogHeader>

									{isConnected ? (
										<div className="space-y-6 py-4">
											{/* Status Banner */}
											{integration.syncStatus ===
											"ERROR" ? (
												<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
													<div className="flex items-center gap-2 text-destructive font-medium">
														<AlertCircle className="h-4 w-4" />
														Integration Error
													</div>
													<p className="text-xs text-destructive/80 mt-1">
														{integration.lastError ||
															"Connection failed"}
													</p>
													<Button
														size="sm"
														variant="outline"
														className="mt-3"
														onClick={() =>
															handleRefreshToken(
																source
															)
														}
														disabled={
															actionLoading ===
															"refresh"
														}
													>
														{actionLoading ===
														"refresh" ? (
															<Loader2 className="h-3 w-3 animate-spin mr-2" />
														) : (
															<RefreshCw className="h-3 w-3 mr-2" />
														)}
														Retry Connection
													</Button>
												</div>
											) : (
												<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-900/20 dark:border-emerald-900">
													<div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
														<CheckCircle2 className="h-4 w-4" />
														Integration Active
													</div>
													<p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 mt-1">
														{integration.lastSyncedAt
															? `Last synchronized ${new Date(integration.lastSyncedAt).toLocaleString()}`
															: "Ready to sync"}
													</p>
												</div>
											)}

											{/* Permissions */}
											{integration.scopes &&
												integration.scopes.length >
													0 && (
													<div className="space-y-3">
														<h4 className="text-sm font-medium">
															Active Permissions
														</h4>
														<div className="grid gap-2 max-h-40 overflow-y-auto">
															{integration.scopes.map(
																(scope) => (
																	<div
																		key={
																			scope
																		}
																		className="flex items-center justify-between text-sm border p-2 rounded bg-card"
																	>
																		<span className="text-xs">
																			{
																				scope
																			}
																		</span>
																		<Badge
																			variant="secondary"
																			className="text-[10px]"
																		>
																			Granted
																		</Badge>
																	</div>
																)
															)}
														</div>
													</div>
												)}

											{/* Webhook Settings */}
											{["GOOGLE", "MICROSOFT"].includes(
												source
											) && (
												<div className="space-y-3">
													<h4 className="text-sm font-medium">
														Real-time Updates
													</h4>
													{integration.metadata
														?.webhook ? (
														<div className="flex items-center justify-between text-sm border p-3 rounded bg-card">
															<div className="flex items-center gap-2">
																<Webhook className="h-4 w-4 text-green-500" />
																<span>
																	Webhooks
																	Active
																</span>
															</div>
															<Badge
																variant="secondary"
																className="text-[10px]"
															>
																Enabled
															</Badge>
														</div>
													) : (
														<div className="border p-3 rounded bg-muted/50">
															<p className="text-xs text-muted-foreground mb-2">
																Enable real-time
																sync for instant
																updates
															</p>
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	handleRegisterWebhook(
																		source
																	)
																}
																disabled={
																	actionLoading ===
																	"webhook"
																}
															>
																{actionLoading ===
																"webhook" ? (
																	<Loader2 className="h-3 w-3 animate-spin mr-2" />
																) : (
																	<Webhook className="h-3 w-3 mr-2" />
																)}
																Enable Webhooks
															</Button>
														</div>
													)}
												</div>
											)}

											{/* Sync Settings */}
											<div className="space-y-3">
												<h4 className="text-sm font-medium">
													Sync Settings
												</h4>
												<div className="flex items-center justify-between">
													<Label
														htmlFor="auto-sync"
														className="font-normal"
													>
														Auto-sync enabled
													</Label>
													<Switch
														id="auto-sync"
														defaultChecked
													/>
												</div>
											</div>
										</div>
									) : (
										<div className="py-8 text-center space-y-4">
											<div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center text-2xl">
												<Image
													src={
														SOURCE_ICONS[
															source as ToolSource
														]
													}
													alt={`${source} icon`}
													width={20}
													height={20}
												/>
											</div>
											<div>
												<h3 className="font-medium">
													Connect{" "}
													{SOURCE_NAMES[source]}
												</h3>
												<p className="text-sm text-muted-foreground max-w-[280px] mx-auto mt-1">
													Grant read-only access to
													allow ClutterScore to audit
													your workspace and identify
													optimization opportunities.
												</p>
											</div>
										</div>
									)}

									<DialogFooter className="sm:justify-between gap-2">
										{isConnected ? (
											<>
												<Button
													variant="ghost"
													className="text-destructive hover:text-destructive hover:bg-destructive/10"
													onClick={() =>
														setShowDisconnectDialog(
															true
														)
													}
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Disconnect
												</Button>
												<Button
													variant="outline"
													onClick={() =>
														handleSync(source)
													}
													disabled={
														isSyncing ||
														actionLoading ===
															"sync" ||
														integration.syncStatus ===
															"SYNCING"
													}
												>
													{isSyncing ||
													actionLoading === "sync" ||
													integration.syncStatus ===
														"SYNCING" ? (
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													) : (
														<RefreshCw className="mr-2 h-4 w-4" />
													)}
													Sync Now
												</Button>
											</>
										) : (
											<Button
												className="w-full"
												onClick={() =>
													connectIntegration(source)
												}
											>
												<Plug className="mr-2 h-4 w-4" />
												Connect Integration
											</Button>
										)}
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</div>
					);
				})}
			</CardContent>

			{/* Disconnect Confirmation Dialog */}
			<AlertDialog
				open={showDisconnectDialog}
				onOpenChange={setShowDisconnectDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Disconnect Integration?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will disconnect{" "}
							{selectedSource && SOURCE_NAMES[selectedSource]}{" "}
							from your organization. Historical audit data will
							be preserved, but you won&apos;t receive new
							updates. You can reconnect at any time.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDisconnect}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={actionLoading === "disconnect"}
						>
							{actionLoading === "disconnect" ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Disconnect
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
