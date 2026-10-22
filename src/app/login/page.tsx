"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthForm } from "@/components/forms/auth-form";
import { AuthShell } from "@/components/forms/auth-shell";

const Login = () => {
	const { user } = authClient.useSession().data || {};
	const router = useRouter();

	useEffect(() => {
		if (user) {
			router.push("/dashboard");
		}
	}, [user, router]);

	return (
		<AuthShell variant="login">
			<AuthForm />
		</AuthShell>
	);
};

export default Login;
