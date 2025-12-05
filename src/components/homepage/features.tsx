import {
	CheckCircle2,
	Database,
	HardDrive,
	Lock,
	Search,
	Sparkles,
} from "lucide-react";
import React from "react";
import { Card, CardContent, CardHeader } from "../ui/card";

function Features() {
	return (
		<section className="py-32" id="features">
			<div className="container mx-auto px-4">
				<div className="text-center max-w-3xl mx-auto mb-20">
					<h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
						One dashboard to clean it all.
					</h2>
					<p className="text-xl text-muted-foreground">
						Stop paying for storage you don&apos;t use and SaaS
						seats for people who don&apos;t work there anymore.
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
					{[
						{
							icon: Database,
							title: "Storage & Waste",
							desc: "Instantly identify and delete duplicates, large unused files, and archived projects costing you thousands.",
						},
						{
							icon: Lock,
							title: "Ghost Access",
							desc: "Automatically detect and revoke access for ex-employees and external contractors who left months ago.",
						},
						{
							icon: Search,
							title: "Search Friction",
							desc: "Archive zombie Slack channels and empty Notion pages to make search actually useful again.",
						},
						{
							icon: HardDrive,
							title: "SaaS Sprawl",
							desc: "Identify unused licenses across your stack and cut your monthly burn by 20-30% instantly.",
						},
						{
							icon: Sparkles,
							title: "One-Click Hygiene",
							desc: "Approve AI-suggested cleanup playbooks with a single click. We handle the API heavy lifting.",
						},
						{
							icon: CheckCircle2,
							title: "Audit Log",
							desc: "Every file deleted and permission revoked is logged. Undo any action for up to 30 days.",
						},
					].map((feature, i) => (
						<Card
							key={i}
							className="bg-card border-border/60 hover:border-primary/20 transition-colors"
						>
							<CardHeader>
								<div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
									<feature.icon className="h-6 w-6 text-primary" />
								</div>
								<h3 className="font-display text-xl font-bold">
									{feature.title}
								</h3>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">
									{feature.desc}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

export default Features;
