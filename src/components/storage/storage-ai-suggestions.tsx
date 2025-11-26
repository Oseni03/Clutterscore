"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Wand2,
	Loader2,
	Trash2,
	HardDrive,
	FileWarning,
	FolderSearch,
} from "lucide-react";

interface Suggestion {
	title: string;
	desc: string;
	impact: string;
	icon: React.ReactNode;
}

export default function StorageAISuggestions() {
	const [loading, setLoading] = useState<boolean>(false);
	const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

	const generateSuggestions = async () => {
		setLoading(true);

		// simulate an LLM processing delay
		await new Promise((res) => setTimeout(res, 1500));

		// mock suggestions (replace with real AI API call)
		const aiSuggestions: Suggestion[] = [
			{
				title: "Delete 8TB of unused raw video footage in Marketing",
				desc: "The Marketing/Raw_Footage directory contains duplicate .mov files last accessed 14+ months ago.",
				icon: <FolderSearch className="h-5 w-5 text-purple-500" />,
				impact: "High impact · ~$320/mo savings",
			},
			{
				title: "Compress old project archives",
				desc: "Compress .zip, .psd, and .sql files that haven't been accessed in over 12 months.",
				icon: <FileWarning className="h-5 w-5 text-yellow-500" />,
				impact: "Medium impact · ~$90/mo savings",
			},
			{
				title: "Auto-expire Slack shared files",
				desc: "Slack media files persist forever. Enable 90-day auto-cleanup to prevent future storage bloat.",
				icon: <Trash2 className="h-5 w-5 text-red-500" />,
				impact: "Medium impact · Prevents future bloat",
			},
			{
				title: "Move inactive database backups to cold storage",
				desc: "Backups older than 6 months should be archived to cold storage for lower cost.",
				icon: <HardDrive className="h-5 w-5 text-blue-500" />,
				impact: "Low impact · Long-term savings",
			},
		];

		setSuggestions(aiSuggestions);
		setLoading(false);
	};

	return (
		<Card className="mt-6">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Wand2 className="h-5 w-5 text-primary" />
					Storage Optimization Suggestions (AI)
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				<Button
					onClick={generateSuggestions}
					className="flex items-center gap-2"
					disabled={loading}
				>
					{loading ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							Analyzing Storage…
						</>
					) : (
						<>
							<Wand2 className="h-4 w-4" />
							Run Optimization Analysis
						</>
					)}
				</Button>

				{/* Loading Skeleton */}
				{loading && (
					<div className="space-y-4 mt-4">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="animate-pulse p-4 border rounded-lg bg-muted/30"
							>
								<div className="h-4 bg-muted rounded w-1/2" />
								<div className="h-3 bg-muted rounded w-3/4 mt-2" />
							</div>
						))}
					</div>
				)}

				{/* AI Results */}
				{!loading && suggestions && (
					<div className="space-y-4 mt-4">
						{suggestions.map((s, i) => (
							<div
								key={i}
								className="p-4 border rounded-lg bg-muted/10 flex gap-4"
							>
								<div className="mt-1">{s.icon}</div>

								<div className="flex-1">
									<p className="font-medium">{s.title}</p>
									<p className="text-sm text-muted-foreground">
										{s.desc}
									</p>
									<p className="text-xs text-primary mt-2">
										{s.impact}
									</p>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
