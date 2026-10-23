import { formatSize } from "@/lib/utils";
import { ArchiveStats } from "@/types/archives";

function ArchivesStats({ stats }: { stats: ArchiveStats }) {
	return (
		<div className="grid gap-4 md:grid-cols-3">
			<div className="rounded-xl border border-border bg-background p-5">
				<div className="text-[13px] font-medium text-muted-foreground">
					Archived files
				</div>
				<div className="mt-2 font-display text-[32px] font-semibold tracking-[-0.03em]">
					{stats.totalFiles}
				</div>
			</div>

			<div className="rounded-xl border border-border bg-background p-5">
				<div className="text-[13px] font-medium text-muted-foreground">
					Total size
				</div>
				<div className="mt-2 font-display text-[32px] font-semibold tracking-[-0.03em]">
					{formatSize(stats.totalSizeMb)}
				</div>
			</div>

			<div className="rounded-xl bg-night p-5 text-paper">
				<div className="text-[13px] font-medium text-[#A8A8A2]">
					Expiring in 7 days
				</div>
				<div className="mt-2 font-display text-[32px] font-semibold tracking-[-0.03em] text-[#F4B183]">
					{stats.expiringSoon}
				</div>
			</div>
		</div>
	);
}

export default ArchivesStats;
