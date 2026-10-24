import Link from "next/link";
import { APP_NAME } from "@/lib/config";

export default function NotFound() {
	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<div className="px-6 py-6 md:px-12">
				<Link
					href="/"
					className="font-display text-2xl font-bold tracking-[-0.03em] transition-opacity hover:opacity-70"
				>
					{APP_NAME}
				</Link>
			</div>

			<div className="flex flex-1 items-center justify-center p-6">
				<div className="w-full max-w-[1100px] rounded-xl bg-muted px-6 py-14 text-center sm:px-8 sm:py-16 lg:py-[72px]">
					<div className="flex items-center justify-center gap-3 font-display text-[96px] font-semibold leading-none tracking-[-0.05em] sm:text-[128px] lg:text-[160px]">
						<span>4</span>
						<span
							aria-hidden="true"
							className="inline-block size-20 rounded-full bg-orb sm:size-24 lg:size-32"
						/>
						<span>4</span>
					</div>

					<h1 className="mt-10 font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[48px]">
						This page got{" "}
						<span className="highlight">cleaned up</span>
					</h1>
					<p className="mx-auto mt-4 max-w-[480px] text-base text-muted-foreground sm:text-lg">
						We couldn&apos;t find the page you&apos;re looking for.
						It may have been moved, archived or never existed.
					</p>

					<div className="mt-8 flex flex-wrap justify-center gap-3">
						<Link
							href="/dashboard"
							className="rounded-full bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-70"
						>
							Go to dashboard
						</Link>
						<Link
							href="/"
							className="rounded-full border border-border bg-background px-6 py-3.5 text-[15px] font-semibold text-foreground transition-opacity hover:opacity-70"
						>
							Back to home
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
