"use client";

interface DangerZoneCardProps {
	onResetData: () => void;
	onDeleteOrganization: () => void;
}

export function DangerZoneCard({
	onResetData,
	onDeleteOrganization,
}: DangerZoneCardProps) {
	return (
		<div className="rounded-xl bg-night p-6 text-paper">
			<h2 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[#F4B183]">
				Danger zone
			</h2>
			<p className="text-[13px] text-[#A8A8A2]">
				Only admins can see these actions.
			</p>

			<div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-4">
				<div className="min-w-0 flex-1 basis-[280px]">
					<div className="text-[15px] font-semibold">
						Reset workspace data
					</div>
					<p className="text-[13px] text-[#A8A8A2]">
						Clears audits, files, scores, playbooks and logs.
						Integrations stay connected.
					</p>
				</div>
				<button
					type="button"
					onClick={onResetData}
					className="inline-flex min-h-11 items-center rounded-full border border-[#3A3A3A] px-5 text-sm font-semibold text-paper transition-colors hover:bg-white/5"
				>
					Reset data
				</button>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
				<div className="min-w-0 flex-1 basis-[280px]">
					<div className="text-[15px] font-semibold">
						Delete workspace
					</div>
					<p className="text-[13px] text-[#A8A8A2]">
						Permanently removes this workspace, its members and all
						data.
					</p>
				</div>
				<button
					type="button"
					onClick={onDeleteOrganization}
					className="inline-flex min-h-11 items-center rounded-full bg-[#F4B183] px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-85"
				>
					Delete workspace
				</button>
			</div>
		</div>
	);
}
