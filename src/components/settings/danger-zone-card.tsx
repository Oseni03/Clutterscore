"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface DangerZoneCardProps {
	onResetData: () => void;
	onDeleteOrganization: () => void;
}

export function DangerZoneCard({
	onResetData,
	onDeleteOrganization,
}: DangerZoneCardProps) {
	return (
		<Card className="border-destructive/50 bg-destructive/5">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-destructive">
					<AlertTriangle className="w-5 h-5" />
					Danger Zone
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-background">
					<div className="max-w-2xl">
						<h4 className="font-semibold text-foreground">
							Reset All Data
						</h4>
						<p className="text-sm text-muted-foreground mt-1">
							Permanently delete all audit history, playbooks,
							files, and integrations. Reset your Clutterscore to
							zero. This cannot be undone.
						</p>
					</div>
					<Button
						variant="destructive"
						size="sm"
						onClick={onResetData}
						className="shrink-0"
					>
						Reset All Data
					</Button>
				</div>

				<Separator />

				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-background">
					<div className="max-w-2xl">
						<h4 className="font-semibold text-foreground">
							Delete Organization
						</h4>
						<p className="text-sm text-muted-foreground mt-1">
							Permanently delete this workspace and all associated
							data. This action cannot be undone.
						</p>
					</div>
					<Button
						variant="destructive"
						size="sm"
						onClick={onDeleteOrganization}
						className="shrink-0"
					>
						Delete Workspace
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
