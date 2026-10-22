import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface Stats {
	total: number;
	security: number;
	savings: number;
	efficiency: number;
}

interface PlaybooksFiltersProps {
	currentValue: string;
	onTabChange: (value: string) => void;
	searchValue: string;
	onSearchChange: (value: string) => void;
	stats: Stats;
}

const TABS = [
	{ value: "all", label: "All" },
	{ value: "security", label: "Security" },
	{ value: "savings", label: "Savings" },
	{ value: "efficiency", label: "Efficiency" },
];

export default function PlaybooksFilters({
	currentValue,
	onTabChange,
	searchValue,
	onSearchChange,
	stats,
}: PlaybooksFiltersProps) {
	const counts: Record<string, number> = {
		all: stats.total,
		security: stats.security,
		savings: stats.savings,
		efficiency: stats.efficiency,
	};

	return (
		<div className="flex flex-wrap items-center justify-between gap-4">
			<Tabs
				value={currentValue}
				className="w-full sm:w-auto"
				onValueChange={onTabChange}
			>
				<TabsList className="h-auto flex-wrap justify-start rounded-full border border-border bg-background p-1">
					{TABS.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className="h-10 rounded-full px-4 text-sm font-medium"
						>
							{tab.label}{" "}
							<span className="opacity-70">
								{counts[tab.value]}
							</span>
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			<div className="w-full max-w-[320px]">
				<label htmlFor="playbook-search" className="sr-only">
					Search playbooks
				</label>
				<Input
					id="playbook-search"
					placeholder="Search playbooks"
					className="h-11 rounded-md bg-background"
					value={searchValue}
					onChange={(event) => onSearchChange(event.target.value)}
				/>
			</div>
		</div>
	);
}
