import Link from "next/link";

type AccountTab = "profile" | "preferences";

const ACCOUNT_TABS: { id: AccountTab; label: string; href: string }[] = [
	{ id: "profile", label: "Profile", href: "/dashboard/account" },
	{
		id: "preferences",
		label: "Preferences",
		href: "/dashboard/account/preferences",
	},
];

interface AccountHeaderProps {
	title: string;
	subtitle: string;
	active: AccountTab;
}

export function AccountHeader({ title, subtitle, active }: AccountHeaderProps) {
	return (
		<header className="rounded-2xl border border-border bg-background p-6 md:p-7">
			<h1 className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] md:text-[36px]">
				{title}
			</h1>
			<p className="mt-2 max-w-[620px] text-sm leading-6 text-muted-foreground">
				{subtitle}
			</p>
			<nav
				aria-label="Account settings"
				className="mt-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-muted p-1"
			>
				{ACCOUNT_TABS.map((tab) => {
					const isActive = tab.id === active;

					return (
						<Link
							key={tab.id}
							href={tab.href}
							aria-current={isActive ? "page" : undefined}
							className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-5 text-sm font-medium transition-colors ${
								isActive
									? "bg-ink text-paper"
									: "text-foreground hover:bg-background"
							}`}
						>
							{tab.label}
						</Link>
					);
				})}
			</nav>
		</header>
	);
}
