import { cn } from "@/lib/utils";

type SampleScoreRingProps = {
	score?: number;
	size?: number;
	className?: string;
};

const VIEWBOX = 180;
const RADIUS = 70;
const STROKE_WIDTH = 16;
const CIRCUMFERENCE = RADIUS * 2 * Math.PI;

export function SampleScoreRing({
	score = 72,
	size = 180,
	className,
}: SampleScoreRingProps) {
	const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

	return (
		<div
			className={cn("relative", className)}
			style={{ width: size, height: size }}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
				role="img"
				aria-label={`Sample ClutterScore ${score} out of 100`}
			>
				<circle
					cx={VIEWBOX / 2}
					cy={VIEWBOX / 2}
					r={RADIUS}
					fill="none"
					stroke="var(--mist)"
					strokeWidth={STROKE_WIDTH}
				/>
				<circle
					cx={VIEWBOX / 2}
					cy={VIEWBOX / 2}
					r={RADIUS}
					fill="none"
					stroke="var(--ink)"
					strokeWidth={STROKE_WIDTH}
					strokeLinecap="round"
					strokeDasharray={CIRCUMFERENCE}
					strokeDashoffset={offset}
					transform={`rotate(-90 ${VIEWBOX / 2} ${VIEWBOX / 2})`}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span
					className={cn(
						"font-display font-semibold leading-none tracking-[-0.03em] text-ink",
						size >= 180 ? "text-[48px]" : "text-[44px]"
					)}
				>
					{score}
				</span>
				<span className="mt-1 text-[12px] text-graphite">
					out of 100
				</span>
			</div>
		</div>
	);
}
