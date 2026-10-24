import Link from "next/link";
import { AuthAside } from "@/components/forms/auth-aside";

type AuthShellProps = {
	variant: "login" | "signup";
	children: React.ReactNode;
};

export function AuthShell({ variant, children }: AuthShellProps) {
	return (
		<div className="flex min-h-screen flex-wrap bg-background font-sans text-foreground">
			<div className="flex min-w-0 flex-1 basis-[480px] flex-col px-6 py-8 md:px-12">
				<Link
					href="/"
					className="self-start font-display text-2xl font-bold tracking-[-0.03em]"
				>
					Clutterscore
				</Link>
				<div className="flex flex-1 items-center justify-center py-12">
					<div className="w-full max-w-[400px]">{children}</div>
				</div>
			</div>
			<div className="flex min-w-0 flex-1 basis-[480px] p-6">
				<AuthAside variant={variant} />
			</div>
		</div>
	);
}
