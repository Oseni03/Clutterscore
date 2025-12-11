"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	ArrowLeft,
	CheckCircle2,
	XCircle,
	Play,
	AlertCircle,
	Loader2,
	Shield,
	DollarSign,
	Zap,
} from "lucide-react";
import { usePlaybooks } from "@/hooks/use-playbooks";
import { PlaybookWithItems } from "@/types/audit";
import { toast } from "sonner";
import Image from "next/image";
import { SOURCE_ICONS } from "@/lib/utils";
import { ToolSource } from "@prisma/client";

const IMPACT_CONFIG = {
	SECURITY: {
		color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
		icon: Shield,
		label: "Security Risk",
	},
	SAVINGS: {
		color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
		icon: DollarSign,
		label: "Cost Savings",
	},
	EFFICIENCY: {
		color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
		icon: Zap,
		label: "Efficiency Gain",
	},
};

export default function PlaybookDetailPage() {
	const params = useParams();
	const router = useRouter();
	const { dismissPlaybook, executePlaybook, isExecuting } = usePlaybooks();

	const [playbook, setPlaybook] = useState<PlaybookWithItems | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showExecuteDialog, setShowExecuteDialog] = useState(false);
	const [showDismissDialog, setShowDismissDialog] = useState(false);
	const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

	// Fetch playbook data
	useEffect(() => {
		const fetchPlaybook = async () => {
			try {
				setIsLoading(true);
				setError(null);

				const response = await fetch(`/api/playbooks/${params.id}`);
				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to fetch playbook");
				}

				const playbook = data?.playbook as PlaybookWithItems;
				setPlaybook(playbook);

				// Initialize selected items after playbook is loaded
				if (playbook?.items) {
					const selected = new Set(
						playbook.items
							.filter((item) => item.isSelected)
							.map((item) => item.id)
					);
					setSelectedItems(selected);
				}
			} catch (err) {
				const errorMessage =
					(err as Error).message || "Failed to fetch playbook";
				setError(errorMessage);
				toast.error(errorMessage);
			} finally {
				setIsLoading(false);
			}
		};

		if (params.id) {
			fetchPlaybook();
		}
	}, [params.id]); // Only depend on params.id, not playbook

	const handleExecute = async () => {
		if (!playbook) return;

		try {
			await executePlaybook(playbook.id);
			setShowExecuteDialog(false);
			router.push("/dashboard/playbooks");
		} catch {
			// Error handled by hook
		}
	};

	const handleDismiss = async () => {
		if (!playbook) return;

		try {
			await dismissPlaybook(playbook.id);
			setShowDismissDialog(false);
			router.push("/dashboard/playbooks");
		} catch {
			// Error handled by hook
		}
	};

	const toggleItem = (itemId: string) => {
		setSelectedItems((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(itemId)) {
				newSet.delete(itemId);
			} else {
				newSet.add(itemId);
			}
			return newSet;
		});
	};

	const toggleAll = () => {
		if (!playbook?.items) return;

		if (selectedItems.size === playbook.items.length) {
			setSelectedItems(new Set());
		} else {
			setSelectedItems(new Set(playbook.items.map((item) => item.id)));
		}
	};

	if (isLoading) {
		return (
			<div className="p-4 md:p-6 space-y-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-64" />
				<Skeleton className="h-96" />
			</div>
		);
	}

	if (error || !playbook) {
		return (
			<div className="p-4 md:p-6">
				<Button
					variant="ghost"
					onClick={() => router.push("/dashboard/playbooks")}
					className="mb-6"
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Playbooks
				</Button>
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						{error || "Playbook not found"}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const config = IMPACT_CONFIG[playbook.impactType];
	const Icon = config.icon;
	const canExecute =
		playbook.status === "PENDING" || playbook.status === "APPROVED";
	const itemsCount = playbook.items?.length || 0;

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* Back Button */}
			<Button
				variant="ghost"
				onClick={() => router.push("/dashboard/playbooks")}
				size="sm"
			>
				<ArrowLeft className="mr-2 h-4 w-4" />
				Back to Playbooks
			</Button>

			{/* Header Card */}
			<Card className="p-6">
				<div className="flex items-start gap-4">
					<div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0">
						<Image
							src={SOURCE_ICONS[playbook.source as ToolSource]}
							alt={`${playbook.source} icon`}
							width={20}
							height={20}
						/>
					</div>
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<h1 className="text-xl md:text-2xl font-bold">
								{playbook.title}
							</h1>
							<Badge
								variant="secondary"
								className={`${config.color} flex items-center gap-1`}
							>
								<Icon className="h-3 w-3" />
								{config.label}
							</Badge>
						</div>
						<p className="text-sm md:text-base text-muted-foreground mb-4">
							{playbook.description}
						</p>

						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<p className="text-muted-foreground">Impact</p>
								<p className="font-semibold">
									{playbook.impact}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground">Items</p>
								<p className="font-semibold">
									{playbook.itemsCount}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground">Status</p>
								<Badge variant="secondary">
									{playbook.status}
								</Badge>
							</div>
							{playbook.riskLevel && (
								<div>
									<p className="text-muted-foreground">
										Risk Level
									</p>
									<Badge
										variant={
											playbook.riskLevel === "CRITICAL"
												? "destructive"
												: "secondary"
										}
									>
										{playbook.riskLevel}
									</Badge>
								</div>
							)}
						</div>
					</div>
				</div>
			</Card>

			{/* Items List */}
			{itemsCount > 0 && (
				<Card className="p-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold">
							Items ({selectedItems.size}/{itemsCount} selected)
						</h2>
						<Button variant="outline" size="sm" onClick={toggleAll}>
							{selectedItems.size === itemsCount
								? "Deselect All"
								: "Select All"}
						</Button>
					</div>

					<div className="space-y-2 max-h-96 overflow-y-auto">
						{playbook.items.map((item) => (
							<div
								key={item.id}
								className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
							>
								<Checkbox
									checked={selectedItems.has(item.id)}
									onCheckedChange={() => toggleItem(item.id)}
									className="mt-1"
								/>
								<div className="flex-1 min-w-0">
									<p className="font-medium text-sm">
										{item.itemName}
									</p>
									<p className="text-xs text-muted-foreground capitalize">
										{item.itemType}
									</p>
									{item.metadata &&
										typeof item.metadata === "object" && (
											<div className="mt-1 flex flex-wrap gap-2">
												{Object.entries(
													item.metadata
												).map(([key, value]) => (
													<span
														key={key}
														className="text-xs bg-muted px-2 py-0.5 rounded"
													>
														{key}: {String(value)}
													</span>
												))}
											</div>
										)}
								</div>
							</div>
						))}
					</div>
				</Card>
			)}

			{/* Actions */}
			{canExecute && (
				<div className="flex flex-col md:flex-row gap-3">
					<Button
						onClick={() => setShowExecuteDialog(true)}
						disabled={
							selectedItems.size === 0 ||
							isExecuting === playbook.id
						}
						className="flex-1"
					>
						{isExecuting === playbook.id ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Executing...
							</>
						) : (
							<>
								<Play className="mr-2 h-4 w-4" />
								Execute Playbook ({selectedItems.size} items)
							</>
						)}
					</Button>
					<Button
						variant="outline"
						onClick={() => setShowDismissDialog(true)}
						className="flex-1 md:flex-none"
					>
						<XCircle className="mr-2 h-4 w-4" />
						Dismiss
					</Button>
				</div>
			)}

			{playbook.status === "EXECUTED" && (
				<Alert>
					<CheckCircle2 className="h-4 w-4 text-green-600" />
					<AlertDescription>
						This playbook was executed on{" "}
						{playbook.executedAt
							? new Date(playbook.executedAt).toLocaleString()
							: "unknown date"}
					</AlertDescription>
				</Alert>
			)}

			{playbook.status === "DISMISSED" && (
				<Alert>
					<XCircle className="h-4 w-4 text-muted-foreground" />
					<AlertDescription>
						This playbook was dismissed on{" "}
						{playbook.dismissedAt
							? new Date(playbook.dismissedAt).toLocaleString()
							: "unknown date"}
					</AlertDescription>
				</Alert>
			)}

			{/* Execute Confirmation Dialog */}
			<AlertDialog
				open={showExecuteDialog}
				onOpenChange={setShowExecuteDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Execute Playbook?</AlertDialogTitle>
						<AlertDialogDescription>
							This will execute the playbook on{" "}
							{selectedItems.size} selected items. This action
							cannot be undone. Are you sure you want to continue?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleExecute}>
							Execute
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Dismiss Confirmation Dialog */}
			<AlertDialog
				open={showDismissDialog}
				onOpenChange={setShowDismissDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Dismiss Playbook?</AlertDialogTitle>
						<AlertDialogDescription>
							This will dismiss this playbook and mark it as not
							needed. You can always generate it again by running
							a new audit.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDismiss}>
							Dismiss
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
