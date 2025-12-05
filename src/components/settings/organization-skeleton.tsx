"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function OrganizationSkeleton() {
	return (
		<div className="w-full flex justify-center">
			<div className="w-full max-w-6xl p-6 space-y-6">
				{/* Page Header Skeleton */}
				<div className="mb-8 space-y-2">
					<div className="h-8 bg-muted rounded w-64 animate-pulse" />
					<div className="h-4 bg-muted rounded w-96 animate-pulse" />
				</div>

				<div className="space-y-6">
					{/* Organization Profile Card Skeleton */}
					<Card className="overflow-hidden">
						<div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background h-32" />
						<CardContent className="p-6 -mt-8">
							<div className="animate-pulse space-y-6">
								<div className="flex items-start gap-4">
									<div className="h-16 w-16 bg-muted rounded-xl" />
									<div className="flex-1 pt-2 space-y-3">
										<div className="h-8 bg-muted rounded w-48" />
										<div className="h-6 bg-muted rounded w-32" />
									</div>
								</div>
								<Separator />
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
									<div className="space-y-2">
										<div className="h-4 bg-muted rounded w-28" />
										<div className="h-6 bg-muted rounded w-32" />
									</div>
									<div className="space-y-2">
										<div className="h-4 bg-muted rounded w-24" />
										<div className="h-8 bg-muted rounded w-20" />
									</div>
									<div className="space-y-2">
										<div className="h-4 bg-muted rounded w-20" />
										<div className="h-6 bg-muted rounded w-28" />
									</div>
								</div>
								<div className="pt-4 border-t">
									<div className="flex items-center justify-between">
										<div className="h-4 bg-muted rounded w-24" />
										<div className="h-4 bg-muted rounded w-20" />
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Subscription Details Card Skeleton */}
					<Card>
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="h-6 w-6 bg-muted rounded animate-pulse" />
								<div className="h-6 bg-muted rounded w-48 animate-pulse" />
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2 animate-pulse">
									<div className="h-4 bg-muted rounded w-24" />
									<div className="h-6 bg-muted rounded w-32" />
								</div>
								<div className="space-y-2 animate-pulse">
									<div className="h-4 bg-muted rounded w-28" />
									<div className="h-4 bg-muted rounded w-full" />
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Danger Zone Card Skeleton */}
					<Card className="border-destructive/50 bg-destructive/5">
						<CardHeader>
							<div className="flex items-center gap-2">
								<div className="h-5 w-5 bg-muted rounded animate-pulse" />
								<div className="h-6 bg-muted rounded w-32 animate-pulse" />
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-background animate-pulse">
								<div className="max-w-2xl space-y-2">
									<div className="h-5 bg-muted rounded w-32" />
									<div className="h-4 bg-muted rounded w-full" />
								</div>
								<div className="h-9 w-32 bg-muted rounded shrink-0" />
							</div>

							<Separator />

							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-background animate-pulse">
								<div className="max-w-2xl space-y-2">
									<div className="h-5 bg-muted rounded w-40" />
									<div className="h-4 bg-muted rounded w-full" />
								</div>
								<div className="h-9 w-36 bg-muted rounded shrink-0" />
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
