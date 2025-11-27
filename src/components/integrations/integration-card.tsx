"use client";

import { useState } from "react";
import { ToolSource, IntegrationSyncStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	AlertCircle,
	CheckCircle,
	Loader2,
	RefreshCw,
	Unplug,
	Webhook,
} from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Integration {
	id: string;
	source: ToolSource;
	isActive: boolean;
	connectedAt: Date;
	lastSyncedAt: Date | null;
	syncStatus: IntegrationSyncStatus;
	lastError: string | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	metadata: any;
}

interface IntegrationCardProps {
	integration: Integration;
	onDisconnect: (source: ToolSource) => Promise<void>;
	onRefreshToken: (source: ToolSource) => Promise<void>;
	onRegisterWebhook: (source: ToolSource) => Promise<void>;
}

const SOURCE_ICONS: Record<ToolSource, string> = {
	SLACK: "💬",
	GOOGLE: "🔍",
	MICROSOFT: "🪟",
	NOTION: "📝",
	DROPBOX: "📦",
	FIGMA: "🎨",
	LINEAR: "📐",
	JIRA: "🔷",
};

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

export function IntegrationCard({
	integration,
	onDisconnect,
	onRefreshToken,
	onRegisterWebhook,
}: IntegrationCardProps) {
	const [isDisconnecting, setIsDisconnecting] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);

	const handleDisconnect = async () => {
		setIsDisconnecting(true);
		try {
			await onDisconnect(integration.source);
		} finally {
			setIsDisconnecting(false);
		}
	};

	const handleRefreshToken = async () => {
		setIsRefreshing(true);
		try {
			await onRefreshToken(integration.source);
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleRegisterWebhook = async () => {
		setIsRegisteringWebhook(true);
		try {
			await onRegisterWebhook(integration.source);
		} finally {
			setIsRegisteringWebhook(false);
		}
	};

	const getStatusBadge = () => {
		switch (integration.syncStatus) {
			case "SYNCING":
				return (
					<Badge variant="secondary" className="gap-1">
						<Loader2 className="h-3 w-3 animate-spin" />
						Syncing
					</Badge>
				);
			case "ERROR":
				return (
					<Badge variant="destructive" className="gap-1">
						<AlertCircle className="h-3 w-3" />
						Error
					</Badge>
				);
			default:
				return (
					<Badge variant="default" className="gap-1 bg-green-500">
						<CheckCircle className="h-3 w-3" />
						Connected
					</Badge>
				);
		}
	};

	return (
		<Card className="p-4">
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-3">
					<div className="text-3xl">
						{SOURCE_ICONS[integration.source]}
					</div>
					<div>
						<h3 className="font-semibold text-base">
							{SOURCE_NAMES[integration.source]}
						</h3>
						<p className="text-sm text-muted-foreground">
							Connected{" "}
							{new Date(
								integration.connectedAt
							).toLocaleDateString()}
						</p>
						{integration.lastSyncedAt && (
							<p className="text-xs text-muted-foreground mt-1">
								Last synced:{" "}
								{new Date(
									integration.lastSyncedAt
								).toLocaleString()}
							</p>
						)}
						{integration.lastError && (
							<p className="text-xs text-destructive mt-1">
								{integration.lastError}
							</p>
						)}
					</div>
				</div>
				{getStatusBadge()}
			</div>

			<div className="flex gap-2 mt-4">
				{integration.syncStatus === "ERROR" && (
					<Button
						size="sm"
						variant="outline"
						onClick={handleRefreshToken}
						disabled={isRefreshing}
					>
						{isRefreshing ? (
							<Loader2 className="h-3 w-3 animate-spin mr-1" />
						) : (
							<RefreshCw className="h-3 w-3 mr-1" />
						)}
						Refresh Token
					</Button>
				)}

				{["GOOGLE", "MICROSOFT"].includes(integration.source) &&
					!integration.metadata?.webhook && (
						<Button
							size="sm"
							variant="outline"
							onClick={handleRegisterWebhook}
							disabled={isRegisteringWebhook}
						>
							{isRegisteringWebhook ? (
								<Loader2 className="h-3 w-3 animate-spin mr-1" />
							) : (
								<Webhook className="h-3 w-3 mr-1" />
							)}
							Enable Webhooks
						</Button>
					)}

				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							size="sm"
							variant="destructive"
							disabled={isDisconnecting}
						>
							{isDisconnecting ? (
								<Loader2 className="h-3 w-3 animate-spin mr-1" />
							) : (
								<Unplug className="h-3 w-3 mr-1" />
							)}
							Disconnect
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Disconnect Integration?
							</AlertDialogTitle>
							<AlertDialogDescription>
								This will disconnect{" "}
								{SOURCE_NAMES[integration.source]} from your
								organization. You can reconnect at any time.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction onClick={handleDisconnect}>
								Disconnect
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</Card>
	);
}
