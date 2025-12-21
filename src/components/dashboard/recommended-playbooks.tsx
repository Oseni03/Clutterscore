"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlaybookCard } from "@/components/playbooks/playbook-card";
import { useRouter } from "next/navigation";
import { ToolSource } from "@prisma/client";

interface Playbook {
	id: string;
	title: string;
	description: string;
	impact: string;
	impactType: "SECURITY" | "SAVINGS" | "EFFICIENCY";
	source: string;
	itemsCount: number;
}

interface RecommendedPlaybooksProps {
	playbooks: Playbook[];
}

export default function RecommendedPlaybooks({
	playbooks,
}: RecommendedPlaybooksProps) {
	const router = useRouter();

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-lg md:text-2xl font-display font-bold">
					Recommended Actions
				</h2>
				<Button
					variant="outline"
					size="sm"
					onClick={() => router.push("/dashboard/playbooks")}
				>
					View All
				</Button>
			</div>

			{playbooks.length > 0 ? (
				<div className="grid lg:grid-cols-2 gap-4 md:gap-6">
					{playbooks.slice(0, 4).map((playbook) => (
						<PlaybookCard
							key={playbook.id}
							title={playbook.title}
							description={playbook.description}
							impact={playbook.impact}
							impactType={playbook.impactType}
							source={playbook.source as ToolSource}
							itemsCount={playbook.itemsCount}
							onAction={() =>
								router.push(
									`/dashboard/playbooks/${playbook.id}`
								)
							}
						/>
					))}
				</div>
			) : (
				<Card className="p-8 md:p-12 text-center">
					<div className="max-w-md mx-auto space-y-2">
						<div className="text-3xl md:text-4xl mb-2">✨</div>
						<h3 className="text-base md:text-lg font-semibold">
							No Recommendations Yet
						</h3>
						<p className="text-xs md:text-sm text-muted-foreground">
							Your workspace is clean! We&apos;ll notify you when
							we find optimization opportunities.
						</p>
					</div>
				</Card>
			)}
		</div>
	);
}
