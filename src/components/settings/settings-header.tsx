"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_TABS = [
	{ href: "/dashboard/settings/integrations", label: "Integrations" },
	{ href: "/dashboard/settings/workspace", label: "Workspace" },
	{ href: "/dashboard/settings/users", label: "Users" },
	{ href: "/dashboard/settings/billing", label: "Billing" },
];

interface SettingsHeaderProps {
	title?: string;
	subtitle?: string;
	action?: ReactNode;
}

export function SettingsHeader({
	title = "Settings",
	subtitle,
	action,
}: SettingsHeaderProps) {
	const pathname = usePathname();

	return (
		<div>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] md:text-[36px]">
						{title}
					</h1>
					{subtitle && (
						<p className="mt-2 text-sm text-muted-foreground">
							{subtitle}
						</p>
					)}
				</div>
				{action}
			</div>
			<div className="mt-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-background p-1">
				{SETTINGS_TABS.map((tab) => {
					const active = pathname === tab.href;
					return (
						<Link
							key={tab.href}
							href={tab.href}
							aria-current={active ? "page" : undefined}
							className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-5 text-sm font-medium transition-colors ${
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
