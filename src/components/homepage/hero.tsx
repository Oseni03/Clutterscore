import Link from "next/link";
import { SampleScoreRing } from "@/components/sample-score";

function Hero() {
	return (
		<>
			<section
				id="top"
				className="mx-auto max-w-[1200px] px-6 pt-16 text-center"
			>
				<div className="text-[13px] font-medium text-muted-foreground">
					Digital workspace hygiene
				</div>
				<h1 className="mx-auto mt-4 max-w-[900px] font-display text-5xl font-semibold leading-[1.02] tracking-[-0.035em] md:text-[72px]">
					The self-service AI{" "}
					<span className="inline-block rounded-md bg-lime px-3.5 text-ink">
						janitor
					</span>{" "}
					for your workspace
				</h1>
				<p className="mx-auto mt-6 max-w-[640px] text-[18px] leading-normal text-muted-foreground">
					Audits, scores and cleans your entire digital workspace in 90
					seconds. You review every change before it runs.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
					<Link
						href="/signup"
						className="rounded-full bg-lime px-6 py-3.5 text-[15px] font-semibold text-ink transition-opacity hover:opacity-70"
					>
						Connect your first tool
					</Link>
					<Link
						href="#sample"
						className="text-[14px] font-medium transition-opacity hover:opacity-70"
					>
						See a sample audit →
					</Link>
				</div>
				<div className="mt-5 text-[13px] text-muted-foreground">
					Works with Google, Slack, Dropbox and Notion
				</div>
			</section>

			<section
				id="sample"
				className="mx-auto mt-14 max-w-[1200px] px-6"
			>
				<div className="flex justify-center rounded-xl bg-dawn p-10 md:px-10 md:py-14">
					<div className="flex w-full max-w-[920px] flex-wrap gap-8 rounded-md border border-line bg-paper p-7 text-left text-ink">
						<div className="flex flex-[0_0_220px] flex-col items-center gap-3">
							<div className="self-start text-[12px] font-medium text-graphite">
								ClutterScore · sample workspace
							</div>
							<SampleScoreRing score={72} size={180} />
						</div>

						<div className="flex min-w-0 flex-1 basis-[400px] flex-col gap-4">
							<div className="flex flex-wrap gap-3">
								<div className="flex-1 basis-[120px] rounded-md bg-mist px-4 py-3.5">
									<div className="text-[12px] text-graphite">
										Est. wasted spend
									</div>
									<div className="font-display text-[22px] font-semibold">
										$4,820/mo
									</div>
								</div>
								<div className="flex-1 basis-[120px] rounded-md bg-mist px-4 py-3.5">
									<div className="text-[12px] text-graphite">
										Wasted storage
									</div>
									<div className="font-display text-[22px] font-semibold">
										1.2 TB
									</div>
								</div>
								<div className="flex-1 basis-[120px] rounded-md bg-mist px-4 py-3.5">
									<div className="text-[12px] text-graphite">
										Stale items
									</div>
									<div className="font-display text-[22px] font-semibold">
										386
									</div>
								</div>
							</div>

							<div className="flex flex-col border-t border-line">
								<div className="flex items-center justify-between gap-3 border-b border-line py-3 text-[14px]">
									<span>Files untouched for a long time</span>
									<span className="rounded-sm bg-mist px-2.5 py-1 text-[12px] font-medium">
										Google
									</span>
								</div>
								<div className="flex items-center justify-between gap-3 border-b border-line py-3 text-[14px]">
									<span>Inactive channels</span>
									<span className="rounded-sm bg-mist px-2.5 py-1 text-[12px] font-medium">
										Slack
									</span>
								</div>
								<div className="flex items-center justify-between gap-3 py-3 text-[14px]">
									<span>Users with unused seats</span>
									<span className="rounded-sm bg-lime px-2.5 py-1 text-[12px] font-medium">
										Playbook ready
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}

export default Hero;
