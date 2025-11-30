"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Building2, Users2, CreditCard, Settings2 } from "lucide-react";
import OrganizationCard from "@/components/settings/organizations";
import SubscriptionCard from "@/components/settings/subscription";
import { QuickActions } from "@/components/settings/quick-actions";

import MembersCard from "@/components/settings/members";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Extract the component that uses useSearchParams into a separate component
const SettingsContent = () => {
	const searchParams = useSearchParams();
	const router = useRouter();
	const defaultTab = searchParams.get("tab") || "organization";
	const [tab, setTab] = useState(defaultTab);

	useEffect(() => {
		const urlTab = searchParams.get("tab");
		if (urlTab && urlTab !== tab) {
			setTab(urlTab);
		}
	}, [searchParams, tab]);

	const handleTabChange = (value: string) => {
		setTab(value);
		router.push(`/dashboard/settings?tab=${value}`);
	};

	return (
		<div className="p-4 sm:p-6 space-y-6 mx-auto">
			{/* Header */}
			<div>
				<h1 className="text-xl sm:text-2xl font-bold text-foreground">
					Settings
				</h1>
				<p className="text-sm sm:text-base text-muted-foreground">
					Manage your organization settings, team members, and
					subscription
				</p>
			</div>

			<Tabs
				value={tab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="flex flex-nowrap overflow-x-auto pb-2 sm:pb-0 mb-6 -mx-4 sm:mx-0 px-4 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
					<TabsTrigger
						value="organization"
						className="flex items-center gap-2 min-w-[120px] sm:min-w-0 whitespace-nowrap"
					>
						<Building2 className="h-4 w-4 flex-shrink-0" />
						<span>Organization</span>
					</TabsTrigger>
					<TabsTrigger
						value="members"
						className="flex items-center gap-2 min-w-[120px] sm:min-w-0 whitespace-nowrap"
					>
						<Users2 className="h-4 w-4 flex-shrink-0" />
						<span>Members</span>
					</TabsTrigger>
					<TabsTrigger
						value="subscription"
						className="flex items-center gap-2 min-w-[120px] sm:min-w-0 whitespace-nowrap"
					>
						<CreditCard className="h-4 w-4 flex-shrink-0" />
						<span>Subscription</span>
					</TabsTrigger>
					<TabsTrigger
						value="actions"
						className="flex items-center gap-2 min-w-[120px] sm:min-w-0 whitespace-nowrap"
					>
						<Settings2 className="h-4 w-4 flex-shrink-0" />
						<span>Actions</span>
					</TabsTrigger>
				</TabsList>

				<div className="-mx-4 sm:mx-0">
					<TabsContent
						value="organization"
						className="space-y-4 sm:space-y-6 px-4 sm:px-0"
					>
						<OrganizationCard />
					</TabsContent>

					<TabsContent
						value="members"
						className="space-y-4 sm:space-y-6 px-4 sm:px-0"
					>
						<MembersCard />
					</TabsContent>

					<TabsContent
						value="subscription"
						className="space-y-4 sm:space-y-6 px-4 sm:px-0"
					>
						<SubscriptionCard />
					</TabsContent>

					<TabsContent
						value="actions"
						className="space-y-4 sm:space-y-6 px-4 sm:px-0"
					>
						<QuickActions />
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
};

// Loading fallback component
const SettingsLoading = () => (
	<div className="p-4 sm:p-6 space-y-6 mx-auto">
		{/* Header Skeleton */}
		<div className="space-y-2">
			<Skeleton className="h-8 w-32 sm:w-40" />
			<Skeleton className="h-4 w-64 sm:w-96" />
		</div>

		{/* Tabs Skeleton */}
		<div className="space-y-6">
			{/* TabsList Skeleton */}
			<div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
				{[1, 2, 3, 4, 5].map((i) => (
					<Skeleton
						key={i}
						className="h-10 w-32 sm:w-40 rounded-md flex-shrink-0"
					/>
				))}
			</div>

			{/* Card Content Skeleton */}
			<div className="space-y-4 -mx-4 sm:mx-0 px-4 sm:px-0">
				<Card>
					<CardHeader>
						<div className="space-y-2">
							<Skeleton className="h-6 w-48" />
							<Skeleton className="h-4 w-72" />
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Field 1 */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
						</div>

						{/* Field 2 */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-10 w-full" />
						</div>

						{/* Field 3 */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-20 w-full" />
						</div>

						{/* Buttons */}
						<div className="flex gap-2 pt-4">
							<Skeleton className="h-10 w-24" />
							<Skeleton className="h-10 w-24" />
						</div>
					</CardContent>
				</Card>

				{/* Additional Card Skeleton */}
				<Card>
					<CardHeader>
						<div className="space-y-2">
							<Skeleton className="h-6 w-40" />
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<Skeleton className="h-16 w-full rounded-lg" />
							<Skeleton className="h-16 w-full rounded-lg" />
							<Skeleton className="h-16 w-full rounded-lg" />
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	</div>
);

// Main page component with Suspense boundary
const Page = () => {
	return (
		<Suspense fallback={<SettingsLoading />}>
			<SettingsContent />
		</Suspense>
	);
};

export default Page;
