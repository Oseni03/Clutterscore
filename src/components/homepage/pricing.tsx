import Link from "next/link";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";

function Pricing() {
	const teamPlan = SUBSCRIPTION_PLANS.find(
		(plan) => plan.id === "pro-tier0"
	);
	const teamPrice = teamPlan?.plans.monthly.price ?? "$875";

	return (
		<section
			id="pricing"
			className="mx-auto max-w-[1200px] px-6 pt-28"
		>
			<h2 className="font-display text-4xl font-semibold leading-[1.1] tracking-[-0.03em] md:text-[40px]">
				Start free. Grow when you need more.
			</h2>

			<div className="mt-8 flex flex-wrap gap-5">
				<div className="flex-1 basis-[320px] rounded-md bg-muted p-8">
					<div className="text-[13px] font-medium text-muted-foreground">
						Free
					</div>
					<div className="mt-2 font-display text-[40px] font-semibold tracking-[-0.03em]">
						$0
					</div>
					<p className="mb-6 mt-2 text-[14px] text-muted-foreground">
						Up to 3 active integrations, audits and your
						ClutterScore.
					</p>
					<Link
						href="/signup"
						className="inline-block rounded-full bg-primary px-[22px] py-3 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-70"
					>
						Get started
					</Link>
				</div>

				<div className="flex-1 basis-[320px] rounded-md bg-night p-8 text-paper">
					<div className="text-[13px] font-medium text-[#A8A8A2]">
						Team
					</div>
					<div className="mt-2 font-display text-[40px] font-semibold tracking-[-0.03em]">
						{teamPrice}
						<span className="text-[16px] font-medium text-[#A8A8A2]">
							/mo
						</span>
					</div>
					<p className="mb-6 mt-2 text-[14px] text-[#A8A8A2]">
						More integrations, more members, and everything in Free.
					</p>
					<Link
						href="/dashboard/settings/billing"
						className="inline-block rounded-full bg-lime px-[22px] py-3 text-[15px] font-semibold text-ink transition-opacity hover:opacity-70"
					>
						View plans
					</Link>
				</div>
			</div>
		</section>
	);
}

export default Pricing;
