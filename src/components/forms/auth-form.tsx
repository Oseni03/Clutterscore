"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePathname } from "next/navigation";
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
import Logo from "../logo";
import { logger } from "@/lib/logger";

const formSchema = z.object({
	email: z.email("Please enter a valid email address"),
});

const AuthContent = ({ className, ...props }: React.ComponentProps<"div">) => {
	const pathname = usePathname();
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [googleLoading, setGoogleLoading] = useState<boolean>(false);

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
				callbackURL: isLogin ? "/dashboard" : "/onboarding",
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
				callbackURL: isLogin ? "/dashboard" : undefined,
				newUserCallbackURL: "/onboarding",
			});

			toast.success("Magic link sent! Check your email.");
		} catch (error) {
			toast.error("Failed to send magic link");
			logger.error("Magic link sign-in error:", error as Error);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<div className="flex flex-col gap-6">
						<div className="flex flex-col items-center gap-2">
							<Link
								href="/"
								className="flex flex-col items-center gap-2 font-medium"
							>
								<div className="flex size-8 items-center justify-center rounded-md">
									<Logo className="size-6" />
								</div>
								<span className="sr-only">Clusterscore</span>
							</Link>
							<h1 className="text-xl font-bold">
								Welcome to Clusterscore.
							</h1>
							{isLogin ? (
								<div className="text-center text-sm">
									Don&apos;t have an account?{" "}
									<Link
										href="/signup"
										className="underline underline-offset-4"
									>
										Sign up
									</Link>
								</div>
							) : (
								<div className="text-center text-sm">
									Already have an account?{" "}
									<Link
										href="/login"
										className="underline underline-offset-4"
									>
										Login
									</Link>
								</div>
							)}
						</div>
						<div className="flex flex-col gap-6">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input
												type="email"
												placeholder="you@example.com"
												{...field}
												className="border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button
								type="submit"
								className="w-full"
								disabled={isLoading}
							>
								{isLogin ? "Send Magic Link" : "Sign up"}
								{isLoading && (
									<Loader2 className="ml-2 h-4 w-4 animate-spin" />
								)}
							</Button>
						</div>
						<div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
							<span className="bg-background text-muted-foreground relative z-10 px-2">
								Or
							</span>
						</div>
						<div className="flex w-full">
							<Button
								variant="outline"
								type="button"
								className="w-full"
								onClick={signInWithGoogle}
								disabled={googleLoading}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									className="mr-2 h-4 w-4"
								>
									<path
										d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
										fill="currentColor"
									/>
								</svg>
								Continue with Google
								{googleLoading && (
									<Loader2 className="ml-2 h-4 w-4 animate-spin" />
								)}
							</Button>
						</div>
					</div>
				</form>
			</Form>
			<div className="text-muted-foreground text-center text-xs text-balance">
				By clicking continue, you agree to our{" "}
				<Link
					href="/terms"
					className="underline underline-offset-4 hover:text-primary"
				>
					Terms of Service
				</Link>{" "}
				and{" "}
				<a
					href="/privacy-policy"
					className="underline underline-offset-4 hover:text-primary"
				>
					Privacy Policy
				</a>
				.
			</div>
		</div>
	);
};

const AuthLoading = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<div className="flex flex-col gap-6">
				<div className="flex flex-col items-center gap-2">
					<div className="flex flex-col items-center gap-2 font-medium">
						<div className="flex size-8 items-center justify-center rounded-md">
							<Logo className="size-6" />
						</div>
					</div>
					<Skeleton className="h-7 w-48" />
					<Skeleton className="h-4 w-56" />
				</div>

				<div className="flex flex-col gap-6">
					<div className="space-y-2">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-10 w-full" />
					</div>

					<Skeleton className="h-10 w-full" />
				</div>

				<div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
					<span className="bg-background text-muted-foreground relative z-10 px-2">
						Or
					</span>
				</div>

				<Skeleton className="h-10 w-full" />
			</div>

			<div className="text-center">
				<Skeleton className="mx-auto h-4 w-64" />
				<Skeleton className="mx-auto mt-1 h-4 w-48" />
			</div>
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
