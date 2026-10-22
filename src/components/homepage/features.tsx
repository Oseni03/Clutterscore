import {
	ArrowUpRight,
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
				<div className="grid md:grid-cols-[80px_1fr] gap-6 md:gap-8 items-start max-w-5xl mb-16">
					<span className="text-eyebrow text-muted-foreground md:pt-2">
						Features
					</span>
					<div>
						<h2 className="text-3xl md:text-[28px] md:leading-tight font-display font-semibold mb-4">
							One dashboard to clean it all.
						</h2>
						<p className="text-lg text-muted-foreground max-w-2xl">
							Stop paying for storage you don&apos;t use and SaaS
							seats for people who don&apos;t work there anymore.
						</p>
					</div>
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
						<Card key={i} className="relative transition-colors">
							<ArrowUpRight className="absolute right-5 top-5 h-4 w-4 text-muted-foreground" />
							<CardHeader>
								<div className="h-12 w-12 rounded-md border border-border bg-background flex items-center justify-center mb-4">
									<feature.icon className="h-6 w-6 text-foreground" />
								</div>
								<h3 className="font-display text-title font-semibold">
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
