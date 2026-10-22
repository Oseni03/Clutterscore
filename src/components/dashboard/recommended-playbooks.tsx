"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
		<div className="rounded-md border border-border bg-background p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 className="font-display text-[20px] font-semibold">
						Recommended playbooks
					</h3>
					<p className="text-[13px] text-muted-foreground">
						From your latest audit. Review each one before it runs.
					</p>
				</div>
				<Link
					href="/dashboard/playbooks"
					className="text-sm font-medium transition-opacity hover:opacity-70"
				>
					View all →
				</Link>
			</div>

			{playbooks.length > 0 ? (
				<div className="mt-4 border-t border-border">
					{playbooks.slice(0, 4).map((playbook) => (
						<div
							key={playbook.id}
							className="flex flex-wrap items-center gap-3 border-b border-border py-4 last:border-b-0"
						>
							<div className="min-w-0 flex-1 basis-[280px]">
								<div className="text-[15px] font-semibold">
									{playbook.title}
								</div>
								<div className="text-[13px] text-muted-foreground">
									{playbook.description}
								</div>
							</div>
							<span className="rounded-sm bg-muted px-2.5 py-1 text-xs font-medium capitalize">
								{playbook.source.toLowerCase()}
							</span>
							<span className="min-w-20 text-right text-sm font-semibold">
								{playbook.impact}
							</span>
							<Button
								size="sm"
								onClick={() =>
									router.push(
										`/dashboard/playbooks/${playbook.id}`
									)
								}
								className="h-9 rounded-full px-[18px] text-[13px]"
							>
								Review
							</Button>
						</div>
					))}
				</div>
			) : (
				<div className="mt-4 border-t border-border pt-6 text-sm text-muted-foreground">
					No recommendations yet. Run an audit to generate cleanup
					playbooks.
				</div>
			)}
		</div>
	);
}
