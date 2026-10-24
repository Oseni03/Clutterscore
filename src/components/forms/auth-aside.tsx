import { Check } from "lucide-react";
import { SampleScoreRing } from "@/components/sample-score";

const freeFeatures = [
	"Up to 3 active integrations",
	"Your ClutterScore and waste estimate",
	"Approve-first playbooks with 30-day undo",
];

type AuthAsideProps = {
	variant: "login" | "signup";
};

export function AuthAside({ variant }: AuthAsideProps) {
	if (variant === "login") {
		return (
			<div className="flex min-h-[420px] flex-1 items-center justify-center rounded-xl bg-dawn p-10">
				<div className="flex w-full max-w-[360px] flex-col items-center gap-4 rounded-md border border-line bg-paper p-7 text-ink">
					<div className="self-start text-[12px] font-medium text-graphite">
						Sample ClutterScore
					</div>
					<SampleScoreRing score={72} size={160} />
					<div className="text-center font-display text-[20px] font-semibold">
						Your first audit takes about 90 seconds
					</div>
					<span className="rounded-sm bg-lime px-2.5 py-1 text-[12px] font-medium">
						Approve every change. Undo for 30 days.
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-[420px] flex-1 items-center justify-center rounded-xl bg-tide p-10">
			<div className="flex w-full max-w-[360px] flex-col gap-1 rounded-md border border-line bg-paper p-7 text-ink">
				<div className="font-display text-[22px] font-semibold">
					What you get on Free
				</div>
				{freeFeatures.map((feature, index) => (
					<div
						key={feature}
						className={
							index < freeFeatures.length - 1
								? "mt-3 flex items-center gap-3 border-b border-line py-3.5 text-[14px]"
								: "mt-3 flex items-center gap-3 py-3.5 text-[14px]"
						}
					>
						<span className="inline-flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-sm bg-ink">
							<Check
								className="h-3 w-3 text-paper"
								strokeWidth={3}
							/>
						</span>
						{feature}
					</div>
				))}
			</div>
		</div>
	);
}
