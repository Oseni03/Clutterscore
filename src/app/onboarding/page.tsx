import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
// import { getActiveOrganization } from "@/server/organizations";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default async function OnboardingPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/login");
	}

	// const organization = await getActiveOrganization(session.user.id);
	// if (organization) {
	// 	redirect("/dashboard");
	// }

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-12">
			<div className="w-full max-w-lg">
				<OnboardingForm user={session.user} />
			</div>
		</div>
	);
}
