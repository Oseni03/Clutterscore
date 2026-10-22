"use client";

const CHART_COLORS = ["#0E0E0E", "#B9A9D6", "#F4B183", "#8FA9A8"];

interface StorageChartProps {
	distribution: {
		name: string;
		value: number;
		sizeGb: number;
	}[];
	totalUsedGb: number;
}

function formatGb(sizeGb: number) {
	if (sizeGb >= 1024) return `${(sizeGb / 1024).toFixed(1)} TB`;
	if (sizeGb < 1) return `${(sizeGb * 1024).toFixed(0)} MB`;
	return `${sizeGb.toFixed(1)} GB`;
}

export default function StorageChart({
	distribution,
	totalUsedGb,
}: StorageChartProps) {
	const radius = 64;
	const circumference = 2 * Math.PI * radius;
	let offset = 0;

	const segments = distribution.map((item, index) => {
		const length = (item.value / 100) * circumference;
		const segment = {
			...item,
			color: CHART_COLORS[index % CHART_COLORS.length],
			dasharray: `${length} ${circumference - length}`,
			dashoffset: -((offset / 100) * circumference),
		};
		offset += item.value;
		return segment;
	});

	return (
		<div className="flex flex-wrap items-center gap-6">
			<div className="relative size-[180px] shrink-0">
				<svg
					width="180"
					height="180"
					viewBox="0 0 180 180"
					role="img"
					aria-label="Donut chart of storage by file type"
				>
					<circle
						cx="90"
						cy="90"
						r={radius}
						fill="none"
						stroke="#F4F4F2"
						strokeWidth="28"
					/>
					{segments.map((segment) => (
						<circle
							key={segment.name}
							cx="90"
							cy="90"
							r={radius}
							fill="none"
							stroke={segment.color}
							strokeWidth="28"
							strokeDasharray={segment.dasharray}
							strokeDashoffset={segment.dashoffset}
							transform="rotate(-90 90 90)"
						/>
					))}
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className="font-display text-2xl font-semibold tracking-[-0.03em]">
						{formatGb(totalUsedGb)}
					</span>
					<span className="text-[11px] text-muted-foreground">
						total
					</span>
				</div>
			</div>

			<div className="flex min-w-[200px] flex-1 flex-col gap-2.5">
				{segments.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No file types to show yet.
					</p>
				) : (
					segments.map((segment) => (
						<div
							key={segment.name}
							className="flex items-center gap-2.5 text-sm"
						>
							<span
								className="size-3 shrink-0 rounded-[3px]"
								style={{ backgroundColor: segment.color }}
							/>
							<span className="flex-1">{segment.name}</span>
							<span className="text-muted-foreground">
								{formatGb(segment.sizeGb)}
							</span>
							<span className="min-w-10 text-right font-semibold">
								{segment.value}%
							</span>
						</div>
					))
				)}
			</div>
		</div>
	);
}
