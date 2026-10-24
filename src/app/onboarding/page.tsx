import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { APP_NAME } from "@/lib/config";

export default async function OnboardingPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/login");
	}

	return (
		<div className="flex min-h-screen flex-col bg-muted text-foreground">
			<div className="flex flex-wrap items-center justify-between gap-3 px-6 py-6 md:px-12">
				<Link
					href="/"
					className="font-display text-2xl font-bold tracking-[-0.03em] transition-opacity hover:opacity-70"
				>
					{APP_NAME}
				</Link>
				<span className="text-[13px] text-muted-foreground">
					Signed in as {session.user.email}
				</span>
			</div>

			<div className="flex flex-1 items-center justify-center p-6">
				<OnboardingForm user={session.user} />
			</div>
		</div>
	);
}
