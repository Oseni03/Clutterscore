"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingDown, Shield, Archive } from "lucide-react";
import Link from "next/link";

interface StorageAISuggestionsProps {
	wastedStorageGb: number;
	largestWaster: {
		type: string;
		sizeGb: number;
		location: string;
	};
	distribution: {
		name: string;
		value: number;
		sizeGb: number;
	}[];
}

export default function StorageAISuggestions({
	wastedStorageGb,
	largestWaster,
	distribution,
}: StorageAISuggestionsProps) {
	const savingsPerMonth = Math.round(wastedStorageGb * 0.1);
	const savingsPerYear = savingsPerMonth * 12;

	const suggestions = [
		{
			icon: TrendingDown,
			color: "text-green-600 bg-green-100 dark:bg-green-900/30",
			title: `Delete ${largestWaster.type} files`,
			description: `${largestWaster.location} contains ${largestWaster.sizeGb.toFixed(1)} GB of ${largestWaster.type.toLowerCase()} files. Consider archiving or deleting old files.`,
			impact: `Save ~$${Math.round(largestWaster.sizeGb * 0.1)}/month`,
			action: "View Files",
			href: "/dashboard/files",
		},
		{
			icon: Archive,
			color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
			title: "Remove duplicate files",
			description:
				"Found multiple copies of the same files across different folders. Removing duplicates can free up significant space.",
			impact: `Potential ${Math.round(wastedStorageGb * 0.3)} GB saved`,
			action: "Find Duplicates",
			href: "/dashboard/files?isDuplicate=true",
		},
		{
			icon: Shield,
			color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
			title: "Review public files",
			description:
				"Some large files are publicly accessible. Review permissions to ensure sensitive data isn't exposed.",
			impact: "Security risk",
			action: "Review Files",
			href: "/dashboard/files?isPublic=true",
		},
	];

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<div className="h-8 w-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center dark:bg-yellow-900/30">
						<Lightbulb className="h-4 w-4" />
					</div>
					<CardTitle>AI-Powered Suggestions</CardTitle>
				</div>
				<p className="text-sm text-muted-foreground mt-2">
					Based on your storage analysis, here are recommended actions
					to optimize costs and improve security.
				</p>
			</CardHeader>
			<CardContent>
				<div className="mb-6 p-4 rounded-lg bg-muted/50 border">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div>
							<p className="text-sm font-medium">
								Potential Savings
							</p>
							<p className="text-2xl md:text-3xl font-bold text-green-600">
								${savingsPerYear}/year
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								By cleaning up {wastedStorageGb.toFixed(1)} GB
								of wasted storage
							</p>
						</div>
						<Button size="lg" asChild>
							<Link href="/dashboard/playbooks">
								View Cleanup Playbooks
							</Link>
						</Button>
					</div>
				</div>

				<div className="space-y-4">
					{suggestions.map((suggestion, index) => {
						const Icon = suggestion.icon;
						return (
							<div
								key={index}
								className="flex gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
							>
								<div
									className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${suggestion.color}`}
								>
									<Icon className="h-5 w-5" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
										<h3 className="font-semibold">
											{suggestion.title}
										</h3>
										<Badge
											variant="secondary"
											className="self-start md:self-center"
										>
											{suggestion.impact}
										</Badge>
									</div>
									<p className="text-sm text-muted-foreground mb-3">
										{suggestion.description}
									</p>
									<Button variant="outline" size="sm" asChild>
										<Link href={suggestion.href}>
											{suggestion.action}
										</Link>
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
