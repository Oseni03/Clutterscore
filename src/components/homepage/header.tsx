"use client";

import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { NavUser } from "../nav-user";
import { Button } from "../ui/button";

function Header() {
	const router = useRouter();
	const { user } = authClient.useSession().data || {};

	return (
		<nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
			<div className="container mx-auto px-4 h-16 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Image
						src={"/generated_images/logo.png"}
						alt="Clutterscore Logo"
						width={32}
						height={32}
						className="h-8 w-8"
					/>
					<span className="font-display font-bold text-xl tracking-tight">
						Clutterscore
					</span>
				</div>
				<div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
					<Link
						href="#features"
						className="hover:text-foreground transition-colors"
					>
						Features
					</Link>
					<Link
						href="#pricing"
						className="hover:text-foreground transition-colors"
					>
						Pricing
					</Link>
					<Link
						href="#about"
						className="hover:text-foreground transition-colors"
					>
						About
					</Link>
				</div>
				<div className="flex items-center gap-4">
					{user?.id ? (
						<>
							<NavUser />
							<Button onClick={() => router.push("/dashboard")}>
								Dashboard
							</Button>
						</>
					) : (
						<>
							<Button
								variant="ghost"
								className="hidden sm:flex"
								onClick={() => router.push("/login")}
							>
								Log in
							</Button>
							<Button onClick={() => router.push("/signup")}>
								Start Free Audit
							</Button>
						</>
					)}
				</div>
			</div>
		</nav>
	);
}

export default Header;
