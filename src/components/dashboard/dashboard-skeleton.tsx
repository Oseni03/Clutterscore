import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
	return (
		<div className="space-y-6 p-6 md:p-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="space-y-3">
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-4 w-80" />
				</div>
				<div className="flex gap-3">
					<Skeleton className="h-11 w-28 rounded-full" />
					<Skeleton className="h-11 w-32 rounded-full" />
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{[1, 2, 3, 4].map((item) => (
					<Skeleton
						key={item}
						className="h-[260px] rounded-md bg-background"
					/>
				))}
			</div>

			<Skeleton className="h-[360px] rounded-md bg-background" />
			<Skeleton className="h-[280px] rounded-md bg-background" />
		</div>
	);
}
