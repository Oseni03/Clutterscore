"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { toast } from "sonner";

export const NotificationsCard = () => {
	const { activeOrganization } = useOrganizationStore((s) => s);
	const [loading, setLoading] = useState(false);
	const [prefs, setPrefs] = useState({
		weeklyReport: true,
		criticalAlerts: true,
		storageLimits: false,
	});

	useEffect(() => {
		const load = async () => {
			if (!activeOrganization) return;
			setLoading(true);
			try {
				const res = await fetch(
					`/api/organizations/${activeOrganization.id}/preferences`
				);
				if (!res.ok) throw new Error("Failed to load preferences");
				const json = await res.json();
				if (json?.data) setPrefs(json.data);
			} catch (err) {
				console.error(err);
				toast.error("Failed to load notification preferences");
			} finally {
				setLoading(false);
			}
		};

		load();
	}, [activeOrganization]);

	const toggle = async (key: keyof typeof prefs) => {
		if (!activeOrganization) return;
		const next = { ...prefs, [key]: !prefs[key] };
		setPrefs(next);
		try {
			const res = await fetch(
				`/api/organizations/${activeOrganization.id}/preferences`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(next),
				}
			);
			if (!res.ok) throw new Error("Failed to update preferences");
			toast.success("Preferences updated");
		} catch (err) {
			console.error(err);
			toast.error("Failed to update preferences");
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Alert Preferences</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base">Weekly Report</Label>
						<div className="text-sm text-muted-foreground">
							Receive a summary of your clutter score every
							Monday.
						</div>
					</div>
					<Switch
						checked={prefs.weeklyReport}
						onCheckedChange={() => toggle("weeklyReport")}
					/>
				</div>
				<Separator />
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base">
							Critical Security Alerts
						</Label>
						<div className="text-sm text-muted-foreground">
							Immediate email when ghost access is detected.
						</div>
					</div>
					<Switch
						checked={prefs.criticalAlerts}
						onCheckedChange={() => toggle("criticalAlerts")}
					/>
				</div>
				<Separator />
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base">Storage Limits</Label>
						<div className="text-sm text-muted-foreground">
							Notify when storage waste exceeds 1TB.
						</div>
					</div>
					<Switch
						checked={prefs.storageLimits}
						onCheckedChange={() => toggle("storageLimits")}
					/>
				</div>
			</CardContent>
		</Card>
	);
};

export default NotificationsCard;
