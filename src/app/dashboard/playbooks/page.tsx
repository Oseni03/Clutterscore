"use client";

import { useState } from "react";
import { PlaybookCard } from "@/components/playbook-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Filter, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { usePlaybooks } from "@/hooks/use-playbooks";
import { useAudit } from "@/hooks/use-audit";
import { useRouter } from "next/navigation";
import { ImpactType } from "@prisma/client";

export default function PlaybooksPage() {
	const router = useRouter();
	const { runAudit, isRunning: isAuditRunning } = useAudit();
	const {
		playbooks,
		filters,
		isLoading,
		error,
		setFilters,
		getFilteredPlaybooks,
		refresh,
	} = usePlaybooks();

	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRunAudit = async () => {
		try {
			await runAudit();
			await refresh();
		} catch (err) {
			// Error already handled by hook
			console.error("Failed to run audit:", err);
		}
	};

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await refresh();
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleTabChange = (value: string) => {
		setFilters({
			impactType:
				value === "all" ? "all" : (value.toUpperCase() as ImpactType),
		});
	};

	const handleSearchChange = (value: string) => {
		setFilters({ search: value });
	};

	const filteredPlaybooks = getFilteredPlaybooks();

	// Stats
	const stats = {
		total: playbooks.length,
		security: playbooks.filter((p) => p.impactType === "SECURITY").length,
		savings: playbooks.filter((p) => p.impactType === "SAVINGS").length,
		efficiency: playbooks.filter((p) => p.impactType === "EFFICIENCY")
			.length,
	};

	if (isLoading) {
		return (
			<div className="p-4 md:p-6 space-y-6">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
					<div className="space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-96" />
					</div>
					<Skeleton className="h-10 w-40" />
				</div>

				<div className="flex flex-col md:flex-row gap-4 items-center justify-between">
					<Skeleton className="h-10 w-full md:w-[400px]" />
					<Skeleton className="h-10 w-full md:w-64" />
				</div>

				<div className="grid lg:grid-cols-2 gap-4 md:gap-6">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-[200px]" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* Header */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
				<div>
					<h1 className="text-xl md:text-2xl font-display font-bold">
						Cleanup Playbooks
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						One-click actions to improve your digital hygiene.
					</p>
				</div>
				<div className="flex gap-2 w-full md:w-auto">
					<Button
						variant="outline"
						onClick={handleRefresh}
						disabled={isRefreshing}
						size="sm"
					>
						{isRefreshing ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 h-4 w-4" />
						)}
						Refresh
					</Button>
					<Button
						onClick={handleRunAudit}
						disabled={isAuditRunning}
						size="sm"
					>
						{isAuditRunning ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 h-4 w-4" />
						)}
						Run Audit
					</Button>
				</div>
			</div>

			{/* Error Alert */}
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Filters */}
			<div className="flex flex-col md:flex-row gap-4 items-center justify-between">
				<Tabs
					value={
						filters.impactType === "all"
							? "all"
							: filters.impactType.toLowerCase()
					}
					className="w-full md:w-auto"
					onValueChange={handleTabChange}
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
							value={filters.search}
							onChange={(e) => handleSearchChange(e.target.value)}
						/>
					</div>
					<Button variant="outline" size="icon">
						<Filter className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Playbooks Grid */}
			<div className="grid lg:grid-cols-2 gap-4 md:gap-6 mt-6">
				{filteredPlaybooks.length > 0 ? (
					filteredPlaybooks.map((playbook) => (
						<PlaybookCard
							key={playbook.id}
							title={playbook.title}
							description={playbook.description}
							impact={playbook.impact}
							impactType={playbook.impactType}
							source={playbook.source}
							itemsCount={playbook.itemsCount}
							onAction={() =>
								router.push(
									`/dashboard/playbooks/${playbook.id}`
								)
							}
						/>
					))
				) : playbooks.length === 0 ? (
					// No playbooks at all
					<div className="col-span-2">
						<div className="text-center py-12 md:py-20 border rounded-lg bg-muted/20">
							<div className="text-4xl md:text-5xl mb-4">✨</div>
							<h3 className="text-lg md:text-xl font-semibold mb-2">
								No Playbooks Yet
							</h3>
							<p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto px-4">
								Run your first audit to generate automated
								cleanup playbooks for your workspace.
							</p>
							<Button
								onClick={handleRunAudit}
								disabled={isAuditRunning}
							>
								{isAuditRunning ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Running Audit...
									</>
								) : (
									<>
										<RefreshCw className="mr-2 h-4 w-4" />
										Run First Audit
									</>
								)}
							</Button>
						</div>
					</div>
				) : (
					// Filtered out all playbooks
					<div className="col-span-2">
						<div className="text-center py-12 md:py-20 text-muted-foreground">
							<div className="text-3xl md:text-4xl mb-4">🔍</div>
							<h3 className="text-base md:text-lg font-medium mb-2">
								No playbooks found
							</h3>
							<p className="text-sm">
								Try adjusting your filters or search criteria.
							</p>
						</div>
					</div>
				)}
			</div>

			{/* Summary Stats */}
			{playbooks.length > 0 && (
				<div className="mt-8 pt-6 border-t">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="text-center">
							<p className="text-2xl md:text-3xl font-bold">
								{stats.total}
							</p>
							<p className="text-xs md:text-sm text-muted-foreground">
								Total Playbooks
							</p>
						</div>
						<div className="text-center">
							<p className="text-2xl md:text-3xl font-bold text-red-600">
								{stats.security}
							</p>
							<p className="text-xs md:text-sm text-muted-foreground">
								Security Risks
							</p>
						</div>
						<div className="text-center">
							<p className="text-2xl md:text-3xl font-bold text-green-600">
								{stats.savings}
							</p>
							<p className="text-xs md:text-sm text-muted-foreground">
								Cost Savings
							</p>
						</div>
						<div className="text-center">
							<p className="text-2xl md:text-3xl font-bold text-blue-600">
								{stats.efficiency}
							</p>
							<p className="text-xs md:text-sm text-muted-foreground">
								Efficiency Gains
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
