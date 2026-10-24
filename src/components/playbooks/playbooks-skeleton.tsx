import { Skeleton } from "@/components/ui/skeleton";

export default function PlaybooksSkeleton() {
	return (
		<div className="space-y-6 p-6 md:p-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="space-y-3">
					<Skeleton className="h-9 w-40" />
					<Skeleton className="h-4 w-96 max-w-full" />
				</div>
				<div className="flex gap-3">
					<Skeleton className="h-11 w-28 rounded-full" />
					<Skeleton className="h-11 w-28 rounded-full" />
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				{[1, 2, 3].map((item) => (
					<Skeleton
						key={item}
						className="h-[104px] rounded-md bg-background"
					/>
				))}
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4">
				<Skeleton className="h-12 w-[420px] max-w-full rounded-full bg-background" />
				<Skeleton className="h-11 w-[320px] max-w-full rounded-md bg-background" />
			</div>

			<div className="grid gap-5 lg:grid-cols-2">
				{[1, 2, 3, 4].map((item) => (
					<Skeleton
						key={item}
						className="h-[230px] rounded-md bg-background"
					/>
				))}
			</div>
		</div>
	);
}
