"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePathname, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import Link from "next/link";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "../ui/form";
import { Skeleton } from "../ui/skeleton";
import { logger } from "@/lib/logger";

const formSchema = z.object({
	email: z.email("Please enter a valid email address"),
});

const AuthContent = ({ className, ...props }: React.ComponentProps<"div">) => {
	const pathname = usePathname();
	const params = useSearchParams();
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [googleLoading, setGoogleLoading] = useState<boolean>(false);
	const [sentEmail, setSentEmail] = useState<string | null>(null);

	const coupon = params.get("coupon");
	const isLogin = pathname === "/login";

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	const signInWithGoogle = async () => {
		try {
			setGoogleLoading(true);
			await authClient.signIn.social({
				provider: "google",
				callbackURL: isLogin
					? "/dashboard"
					: coupon
						? `/onboarding?coupon=${coupon}`
						: "/onboarding",
			});
			toast.success("Redirecting to Google sign-in...");
		} catch (error) {
			logger.error("Error during Google sign-in:", error as Error);
			toast.error("Failed to sign in with Google");
		} finally {
			setGoogleLoading(false);
		}
	};

	async function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			setIsLoading(true);

			await authClient.signIn.magicLink({
				email: values.email,
				callbackURL: isLogin
					? "/dashboard"
					: coupon
						? `/onboarding?coupon=${coupon}`
						: "/onboarding",
				newUserCallbackURL: coupon
					? `/onboarding?coupon=${coupon}`
					: "/onboarding",
			});

			setSentEmail(values.email);
		} catch (error) {
			toast.error("Failed to send magic link");
			logger.error("Magic link sign-in error:", error as Error);
		} finally {
			setIsLoading(false);
		}
	}

	if (sentEmail) {
		return (
			<div className={cn("w-full", className)} {...props}>
				<div className="h-14 w-14 rounded-full bg-orb" />
				<h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] md:text-[40px]">
					Check your email
				</h1>
				<p className="mt-3 text-muted-foreground">
					We sent a {isLogin ? "sign-in" : "sign-up"} link to{" "}
					<span className="font-semibold text-foreground">
						{sentEmail}
					</span>
					.{" "}
					{isLogin
						? "It opens your dashboard."
						: "It takes you to set up your workspace."}
				</p>
				<Button
					type="button"
					variant="secondary"
					className="mt-7 h-11 px-6"
					onClick={() => setSentEmail(null)}
				>
					Use a different email
				</Button>
			</div>
		);
	}

	return (
		<div className={cn("w-full", className)} {...props}>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					{coupon && !isLogin && (
						<div className="mb-6 rounded-md bg-lime px-3.5 py-2.5 text-[13px] font-medium text-ink">
							Coupon{" "}
							<span className="font-semibold">{coupon}</span>{" "}
							applied. It will be added to your free workspace.
						</div>
					)}

					<h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] md:text-[40px]">
						{isLogin ? "Welcome back" : "Start your free audit"}
					</h1>
					<p className="mt-3 text-muted-foreground">
						{isLogin
							? "Log in to see your ClutterScore and review your playbooks."
							: "Create an account, connect a tool, and see your ClutterScore in about 90 seconds."}
					</p>

					<Button
						variant="secondary"
						type="button"
						className="mt-8 w-full gap-2.5"
						onClick={signInWithGoogle}
						disabled={googleLoading}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							className="h-[18px] w-[18px]"
							aria-hidden="true"
						>
							<path
								d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
								fill="currentColor"
							/>
						</svg>
						{isLogin ? "Continue with Google" : "Sign up with Google"}
						{googleLoading && (
							<Loader2 className="h-4 w-4 animate-spin" />
						)}
					</Button>

					<div className="my-6 flex items-center gap-3 text-[13px] text-muted-foreground">
						<span className="h-px flex-1 bg-border" />
						or
						<span className="h-px flex-1 bg-border" />
					</div>

					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-[13px] font-medium">
									Work email
								</FormLabel>
								<FormControl>
									<Input
										type="email"
										placeholder="you@company.com"
										className="h-12 px-4"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Button
						type="submit"
						className="mt-3 w-full"
						disabled={isLoading}
					>
						Send magic link
						{isLoading && (
							<Loader2 className="h-4 w-4 animate-spin" />
						)}
					</Button>
				</form>
			</Form>

			<p className="mt-6 text-center text-[14px] text-muted-foreground">
				{isLogin ? (
					<>
						New to Clutterscore?{" "}
						<Link
							href="/signup"
							className="font-semibold text-foreground transition-opacity hover:opacity-70"
						>
							Sign up
						</Link>
					</>
				) : (
					<>
						Already have an account?{" "}
						<Link
							href="/login"
							className="font-semibold text-foreground transition-opacity hover:opacity-70"
						>
							Log in
						</Link>
					</>
				)}
			</p>
			<p className="mt-4 text-center text-[12px] text-muted-foreground">
				By continuing you agree to the Terms and Privacy Policy.
			</p>
		</div>
	);
};

const AuthLoading = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div className={cn("w-full", className)} {...props}>
			<Skeleton className="h-10 w-56" />
			<Skeleton className="mt-3 h-5 w-full" />
			<Skeleton className="mt-8 h-12 w-full" />
			<div className="my-6 flex items-center gap-3">
				<span className="h-px flex-1 bg-border" />
				<Skeleton className="h-4 w-4 rounded-full" />
				<span className="h-px flex-1 bg-border" />
			</div>
			<Skeleton className="h-4 w-24" />
			<Skeleton className="mt-2 h-12 w-full" />
			<Skeleton className="mt-3 h-12 w-full" />
		</div>
	);
};

export const AuthForm = ({
	className,
	...props
}: React.ComponentProps<"div">) => {
	return (
		<Suspense fallback={<AuthLoading className={className} {...props} />}>
			<AuthContent className={className} {...props} />
		</Suspense>
	);
};
