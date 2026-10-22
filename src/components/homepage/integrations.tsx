"use client";

import { useState } from "react";

const tabs = [
	{
		label: "Google",
		body: "Audit Drive files and users, and register webhooks to stay current.",
		status: "IDLE",
	},
	{
		label: "Slack",
		body: "Review channels and members to find quiet spaces and unused seats.",
		status: "SYNCING",
	},
	{
		label: "Dropbox",
		body: "Find stale and duplicated files that are taking up paid storage.",
		status: "IDLE",
	},
	{
		label: "Notion",
		body: "Surface abandoned pages and inactive members across the workspace.",
		status: "ERROR",
	},
];

const statusStyles: Record<string, string> = {
	IDLE: "bg-muted text-ink",
	SYNCING: "bg-lime text-ink",
	ERROR: "bg-[#F4B183] text-ink",
};

function Integrations() {
	const [activeTab, setActiveTab] = useState(0);
	const tab = tabs[activeTab];

	return (
		<section
			id="integrations"
			className="mx-auto max-w-[1200px] px-6 pt-28 text-center"
		>
			<h2 className="font-display text-4xl font-semibold leading-[1.1] tracking-[-0.03em] md:text-[40px]">
				Connect your tools in one click.
			</h2>
			<p className="mx-auto mt-3 max-w-[560px] text-muted-foreground">
				Authorize with the provider, and Clutterscore keeps each
				integration synced, refreshed and easy to disconnect.
			</p>

			<div
				className="mt-8 inline-flex flex-wrap justify-center gap-1 rounded-full bg-muted p-1"
				aria-label="Integration previews"
			>
				{tabs.map((item, index) => {
					const isActive = index === activeTab;

					return (
						<button
							key={item.label}
							type="button"
							aria-pressed={isActive}
							onClick={() => setActiveTab(index)}
							className={
								isActive
									? "min-h-11 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-paper"
									: "min-h-11 rounded-full bg-transparent px-5 py-2.5 text-[14px] font-medium text-foreground transition-opacity hover:opacity-70"
							}
						>
							{item.label}
						</button>
					);
				})}
			</div>

			<div className="mt-6 flex justify-center rounded-xl bg-tide px-6 py-16">
				<div className="w-full max-w-[460px] rounded-md bg-paper p-6 text-left text-ink">
					<div className="flex items-center justify-between gap-3">
						<span className="font-display text-[22px] font-semibold">
							{tab.label}
						</span>
						<span
							className={`rounded-sm px-2.5 py-1 text-[12px] font-medium ${statusStyles[tab.status]}`}
						>
							{tab.status}
						</span>
					</div>
					<p className="mt-2 text-[14px] text-graphite">
						{tab.body}
					</p>
					<div className="mt-5 flex flex-wrap items-center justify-end gap-3 text-[13px] font-medium">
						<span className="text-graphite">Disconnect</span>
						<span className="rounded-full bg-mist px-4 py-2">
							Manage
						</span>
						<span className="rounded-full bg-ink px-4 py-2 text-paper">
							Sync now
						</span>
					</div>
				</div>
			</div>

			<div className="mt-6 flex flex-wrap gap-x-12 gap-y-6 text-left">
				<div className="flex-1 basis-[280px]">
					<div className="text-[15px] font-semibold">
						Signed, expiring OAuth
					</div>
					<p className="mt-1 text-[14px] text-muted-foreground">
						Each connection is tied to your workspace and the admin
						who started it.
					</p>
				</div>
				<div className="flex-1 basis-[280px]">
					<div className="text-[15px] font-semibold">
						Clear sync status
					</div>
					<p className="mt-1 text-[14px] text-muted-foreground">
						See when each tool last synced, and what went wrong if a
						sync fails.
					</p>
				</div>
			</div>
		</section>
	);
}

export default Integrations;
