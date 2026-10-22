import { cn } from "@/lib/utils";

interface ScoreRingProps {
	score: number;
	size?: number;
	strokeWidth?: number;
	className?: string;
}

export function ScoreRing({
	score,
	size = 120,
	strokeWidth = 8,
	className,
}: ScoreRingProps) {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const offset = circumference - (score / 100) * circumference;

	// Color logic based on score
	// Low score = Bad (Red), High score = Good (Green)
	// But wait, for "Clutterscore", is high good or bad?
	// PRD says "Clutterscore (1-100)". Usually higher score = better in these apps (like credit score).
	// BUT "Clutterscore" sounds like amount of clutter.
	// Let's assume 100 is PERFECT (Clean), 1 is FILTHY.
	// Or let's assume it's a hygiene score.
	// Let's go with 100 = Cleanest.

	const getColor = (s: number) => {
		if (s >= 80) return "text-foreground";
		if (s >= 50) return "text-muted-foreground";
		return "text-destructive";
	};

	return (
		<div
			className={cn(
				"relative flex items-center justify-center",
				className
			)}
			style={{ width: size, height: size }}
		>
			{/* Background Ring */}
			<svg className="transform -rotate-90 w-full h-full">
				<circle
					className="text-border"
					stroke="currentColor"
					strokeWidth={strokeWidth}
					fill="transparent"
					r={radius}
					cx={size / 2}
					cy={size / 2}
				/>
				{/* Progress Ring */}
				<circle
					className={cn(
						"transition-all duration-1000 ease-out",
						getColor(score)
					)}
					stroke="currentColor"
					strokeWidth={strokeWidth}
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					strokeLinecap="round"
					fill="transparent"
					r={radius}
					cx={size / 2}
					cy={size / 2}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span className="text-4xl font-display font-semibold tracking-[-0.03em]">
					{score}
				</span>
				<span className="text-eyebrow uppercase tracking-widest text-muted-foreground mt-1">
					Score
				</span>
			</div>
		</div>
	);
}
