import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
	return (
		<div className="p-4 md:p-6 space-y-6">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-10 w-32" />
			</div>

			<div className="grid md:grid-cols-12 gap-4 md:gap-6">
				<Skeleton className="md:col-span-4 h-[320px]" />
				<div className="md:col-span-8 space-y-4 md:space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
						<Skeleton className="h-[140px]" />
						<Skeleton className="h-[140px]" />
					</div>
					<Skeleton className="h-[240px]" />
				</div>
			</div>

			<div className="space-y-4">
				<Skeleton className="h-8 w-64" />
				<div className="grid lg:grid-cols-2 gap-4 md:gap-6">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-[200px]" />
					))}
				</div>
			</div>
		</div>
	);
}
