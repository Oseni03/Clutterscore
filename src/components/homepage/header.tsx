import Link from "next/link";

function Header() {
	return (
		<header className="w-full">
			<div className="bg-ink px-6 py-[11px] text-center text-[13px] text-paper">
				Start free: connect up to 3 integrations and see your first
				ClutterScore.
			</div>
			<div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-4 px-6 py-[18px]">
				<Link
					href="/"
					className="font-display text-2xl font-bold tracking-[-0.03em]"
				>
					Clutterscore
				</Link>
				<nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
					<Link
						href="#how"
						className="transition-opacity hover:opacity-70"
					>
						How it works
					</Link>
					<Link
						href="#integrations"
						className="transition-opacity hover:opacity-70"
					>
						Integrations
					</Link>
					<Link
						href="#safety"
						className="transition-opacity hover:opacity-70"
					>
						Safety
					</Link>
					<Link
						href="#pricing"
						className="transition-opacity hover:opacity-70"
					>
						Pricing
					</Link>
				</nav>
				<div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
					<Link
						href="/login"
						className="transition-opacity hover:opacity-70"
					>
						Log in
					</Link>
					<Link
						href="/signup"
						className="rounded-full bg-primary px-[18px] py-2.5 text-primary-foreground transition-opacity hover:opacity-70"
					>
						Get started
					</Link>
				</div>
			</div>
		</header>
	);
}

export default Header;
