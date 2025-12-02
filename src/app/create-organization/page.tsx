"use client";

import { CreateOrganizationForm } from "@/components/forms/create-organization-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CreateOrganizationPage() {
	const { data: session, isPending } = authClient.useSession();
	const router = useRouter();

	useEffect(() => {
		// If user already has an active organization, redirect to dashboard
		if (!isPending && session?.activeOrganizationId) {
			router.push("/dashboard");
		}
	}, [session, isPending, router]);

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!session?.user) {
		return null; // Middleware will redirect to login
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4 md:p-6">
			<Card className="w-full max-w-2xl">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold">
						Create Your Organization
					</CardTitle>
					<CardDescription>
						Set up your workspace and choose a subscription plan.
						First-time users can start with a 14-day free trial.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<CreateOrganizationForm />
				</CardContent>
			</Card>
		</div>
	);
}
