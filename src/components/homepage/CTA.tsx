import Link from "next/link";

function CTA() {
	return (
		<section id="start" className="mx-auto max-w-[1200px] px-6 pt-28">
			<div className="flex flex-wrap items-center justify-between gap-8">
				<h2 className="max-w-[680px] font-display text-4xl font-semibold leading-[1.02] tracking-[-0.035em] md:text-[64px]">
					See your score in{" "}
					<span className="inline-block rounded-md bg-lime px-3 text-ink">
						90 seconds
					</span>
				</h2>
				<div className="flex flex-wrap gap-3">
					<Link
						href="/signup"
						className="rounded-full bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-70"
					>
						Connect your first tool
					</Link>
					<Link
						href="/signup?intent=team"
						className="rounded-full bg-muted px-6 py-3.5 text-[15px] font-semibold transition-opacity hover:opacity-70"
					>
						Talk to us
					</Link>
				</div>
			</div>

			<div className="mt-10 flex h-[320px] items-center justify-center rounded-xl bg-muted">
				<div className="h-[200px] w-[200px] rounded-full bg-orb" />
			</div>
		</section>
	);
}

export default CTA;
