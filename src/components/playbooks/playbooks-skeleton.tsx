import { Skeleton } from "@/components/ui/skeleton";

export default function PlaybooksSkeleton() {
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
