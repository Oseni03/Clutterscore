"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_TABS = [
	{ href: "/dashboard/settings/integrations", label: "Integrations" },
	{ href: "/dashboard/settings/workspace", label: "Workspace" },
];

export function SettingsHeader() {
	const pathname = usePathname();

	return (
		<div>
			<h1 className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] md:text-[36px]">
				Settings
			</h1>
			<div className="mt-4 inline-flex gap-1 rounded-full border border-border bg-background p-1">
				{SETTINGS_TABS.map((tab) => {
					const active = pathname === tab.href;
					return (
						<Link
							key={tab.href}
							href={tab.href}
							aria-current={active ? "page" : undefined}
							className={`inline-flex min-h-10 items-center rounded-full px-5 text-sm font-medium transition-colors ${
								active
									? "bg-ink text-paper"
									: "text-foreground hover:bg-muted"
							}`}
						>
							{tab.label}
						</Link>
					);
				})}
			</div>
		</div>
	);
}
