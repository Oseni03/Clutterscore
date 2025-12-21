import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search } from "lucide-react";

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

export default function PlaybooksFilters({
	currentValue,
	onTabChange,
	searchValue,
	onSearchChange,
	stats,
}: PlaybooksFiltersProps) {
	return (
		<div className="flex flex-col md:flex-row gap-4 items-center justify-between">
			<Tabs
				value={currentValue}
				className="w-full md:w-auto"
				onValueChange={onTabChange}
			>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="all">
						All
						{stats.total > 0 && (
							<span className="ml-1 text-xs text-muted-foreground">
								({stats.total})
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value="security">
						Security
						{stats.security > 0 && (
							<span className="ml-1 text-xs text-muted-foreground">
								({stats.security})
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value="savings">
						Savings
						{stats.savings > 0 && (
							<span className="ml-1 text-xs text-muted-foreground">
								({stats.savings})
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value="efficiency">
						Efficiency
						{stats.efficiency > 0 && (
							<span className="ml-1 text-xs text-muted-foreground">
								({stats.efficiency})
							</span>
						)}
					</TabsTrigger>
				</TabsList>
			</Tabs>

			<div className="flex w-full md:w-auto gap-2">
				<div className="relative flex-1 md:w-64">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Filter playbooks..."
						className="pl-9"
						value={searchValue}
						onChange={(e) => onSearchChange(e.target.value)}
					/>
				</div>
				<Button variant="outline" size="icon">
					<Filter className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
