import { Check } from "lucide-react";

const actions = [
	{ text: "Archive files untouched for a long time", source: "Google" },
	{ text: "Archive inactive channels", source: "Slack" },
	{ text: "Remove duplicate files", source: "Dropbox" },
];

function PlaybookReview() {
	return (
		<section className="mx-auto max-w-[1200px] px-6 pt-28">
			<div className="flex flex-wrap gap-x-12 gap-y-6">
				<div className="flex-1 basis-[200px] text-[13px] font-medium text-muted-foreground">
					Playbooks
				</div>
				<div className="min-w-0 flex-[3_1_480px]">
					<h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] md:text-[36px]">
						Cleanup you can review, approve and undo.
					</h2>
					<p className="mt-3 max-w-[560px] text-muted-foreground">
						Clutterscore drafts a playbook of safe changes. Nothing
						runs until an admin approves it, and every action can be
						reversed for 30 days.
					</p>
				</div>
			</div>

			<div className="mt-10 flex justify-center rounded-xl bg-moss px-6 py-14">
				<div
					id="playbook"
					className="w-full max-w-[560px] rounded-md border border-line bg-paper p-6 text-ink"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<div className="text-[12px] font-medium text-graphite">
								Playbook
							</div>
							<div className="font-display text-[20px] font-semibold">
								Archive stale files
							</div>
						</div>
						<span className="rounded-sm bg-lime px-2.5 py-1 text-[12px] font-medium">
							Undo for 30 days
						</span>
					</div>

					<div className="mt-4 border-t border-line">
						{actions.map((action) => (
							<div
								key={action.text}
								className="flex items-center gap-3 border-b border-line py-3 text-[14px]"
							>
								<span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-sm bg-ink">
									<Check
										className="h-3 w-3 text-paper"
										strokeWidth={3}
									/>
								</span>
								<span className="flex-1">{action.text}</span>
								<span className="text-[12px] text-graphite">
									{action.source}
								</span>
							</div>
						))}
					</div>

					<div className="mt-5 flex flex-wrap items-center justify-end gap-3 text-[13px] font-medium">
						<span className="text-graphite">Reject</span>
						<span className="rounded-full bg-ink px-4 py-2 text-paper">
							Approve and run
						</span>
					</div>
				</div>
			</div>
		</section>
	);
}

export default PlaybookReview;
