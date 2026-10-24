import { Skeleton } from "@/components/ui/skeleton";

export function FilesSkeleton() {
	return (
		<div className="space-y-6 p-6 md:p-8">
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-9 w-40" />
					<Skeleton className="h-5 w-80" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-11 w-28 rounded-full" />
					<Skeleton className="h-11 w-28 rounded-full" />
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{[1, 2, 3, 4].map((item) => (
					<Skeleton
						key={item}
						className="h-[104px] rounded-md bg-background"
					/>
				))}
			</div>

			<Skeleton className="h-[76px] rounded-md bg-background" />
			<Skeleton className="h-[520px] rounded-md bg-background" />
		</div>
	);
}
