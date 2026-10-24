"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function OrganizationSkeleton() {
	return (
		<div className="space-y-6">
			<div className="rounded-xl border border-border bg-background p-6">
				<div className="flex items-center justify-between gap-3">
					<Skeleton className="h-7 w-48" />
					<Skeleton className="h-6 w-20" />
				</div>
				<div className="mt-5 flex flex-wrap items-center gap-5">
					<Skeleton className="size-[72px] rounded-2xl" />
					<div className="flex-1 basis-[280px] space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-8 w-56" />
						<Skeleton className="h-4 w-44" />
					</div>
					<div className="flex gap-2.5">
						<Skeleton className="h-11 w-32 rounded-full" />
						<Skeleton className="h-11 w-32 rounded-full" />
					</div>
				</div>
			</div>

			<div className="rounded-xl border border-border bg-background p-6">
				<div className="flex items-center justify-between gap-3">
					<div className="space-y-2">
						<Skeleton className="h-7 w-40" />
						<Skeleton className="h-4 w-52" />
					</div>
					<Skeleton className="h-11 w-32 rounded-full" />
				</div>
				<div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{Array.from({ length: 6 }).map((_, index) => (
						<Skeleton key={index} className="h-[52px] rounded-xl" />
					))}
				</div>
			</div>

			<div className="rounded-xl bg-night p-6">
				<Skeleton className="h-7 w-36 bg-white/10" />
				<Skeleton className="mt-2 h-4 w-52 bg-white/10" />
				<div className="mt-5 space-y-4 border-t border-white/10 pt-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="space-y-2">
							<Skeleton className="h-5 w-40 bg-white/10" />
							<Skeleton className="h-4 w-72 bg-white/10" />
						</div>
						<Skeleton className="h-11 w-28 rounded-full bg-white/10" />
					</div>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="space-y-2">
							<Skeleton className="h-5 w-36 bg-white/10" />
							<Skeleton className="h-4 w-72 bg-white/10" />
						</div>
						<Skeleton className="h-11 w-36 rounded-full bg-white/10" />
					</div>
				</div>
			</div>
		</div>
	);
}
