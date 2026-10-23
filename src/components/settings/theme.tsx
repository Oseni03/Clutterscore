"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const THEME_OPTIONS = [
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
	{ value: "system", label: "System" },
] as const;

type ThemeValue = (typeof THEME_OPTIONS)[number]["value"];

const THEME_LABELS: Record<ThemeValue, string> = {
	light: "Light",
	dark: "Dark",
	system: "System",
};

export function ThemeCard() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const selectedTheme: ThemeValue = mounted
		? ((theme as ThemeValue | undefined) ?? "system")
		: "system";

	return (
		<section className="rounded-2xl border border-border bg-background p-6">
			<h2 className="font-display text-[22px] font-semibold tracking-[-0.03em]">
				Theme
			</h2>
			<p className="mt-2 text-sm text-muted-foreground">
				Light, dark, or match your system. Currently:{" "}
				{THEME_LABELS[selectedTheme]}.
			</p>

			<div
				role="radiogroup"
				aria-label="Theme"
				className="mt-6 flex flex-col gap-3 sm:flex-row"
			>
				{THEME_OPTIONS.map((option) => {
					const isSelected = selectedTheme === option.value;
					const showLightPreview = option.value !== "dark";
					const showDarkPreview = option.value !== "light";

					return (
						<button
							key={option.value}
							type="button"
							role="radio"
							aria-checked={isSelected}
							onClick={() => setTheme(option.value)}
							className={`flex-1 rounded-xl border-2 bg-background p-3 text-left transition-colors ${
								isSelected
									? "border-ink"
									: "border-border hover:border-graphite/50"
							}`}
						>
							<div className="flex h-24 overflow-hidden rounded-lg border border-border">
								{showLightPreview && (
									<div className="flex-1 bg-paper p-2.5">
										<div className="h-1.5 w-3/5 rounded-full bg-ink/80" />
										<div className="mt-2 h-1.5 w-full rounded-full bg-line" />
										<div className="mt-1.5 h-1.5 w-4/5 rounded-full bg-line" />
										<div className="mt-3 h-5 w-2/5 rounded bg-lime" />
									</div>
								)}
								{showDarkPreview && (
									<div className="flex-1 bg-night p-2.5">
										<div className="h-1.5 w-3/5 rounded-full bg-paper/80" />
										<div className="mt-2 h-1.5 w-full rounded-full bg-paper/15" />
										<div className="mt-1.5 h-1.5 w-4/5 rounded-full bg-paper/15" />
										<div className="mt-3 h-5 w-2/5 rounded bg-lime" />
									</div>
								)}
							</div>

							<div className="mt-3 flex items-center gap-2.5">
								<span
									className={`flex size-[18px] items-center justify-center rounded-full border-2 ${
										isSelected
											? "border-ink"
											: "border-border"
									}`}
								>
									{isSelected && (
										<span className="size-2 rounded-full bg-ink" />
									)}
								</span>
								<span className="text-[15px] font-semibold">
									{option.label}
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</section>
	);
}
