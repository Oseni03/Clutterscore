"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	ArrowRight,
	CheckCircle2,
	Database,
	HardDrive,
	Lock,
	Search,
	Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { NavUser } from "@/components/nav-user";

export default function LandingPage() {
	const router = useRouter();
	const { user } = authClient.useSession().data || {};

	return (
		<div className="min-h-screen bg-background font-sans selection:bg-primary selection:text-primary-foreground">
			{/* Navigation */}
			<nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
				<div className="container mx-auto px-4 h-16 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Image
							src={"/generated_images/logo.png"}
							alt="Clutterscore Logo"
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
								<Button
									onClick={() => router.push("/dashboard")}
								>
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

			{/* Hero Section */}
			<section className="relative pt-20 pb-32 overflow-hidden">
				<div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="max-w-2xl"
					>
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-6">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
								<span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
							</span>
							Launch Special: 40% off lifetime (First 500
							companies)
						</div>
						<h1 className="font-display text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] mb-6 text-primary">
							Your workspace is{" "}
							<span className="text-destructive/90 decoration-4 underline-offset-4 decoration-destructive/30 underline">
								filthy
							</span>
							.
						</h1>
						<p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-lg">
							The self-service AI janitor that audits, scores, and
							cleans your entire digital workspace. We&apos;ll
							prove it in 90 seconds.
						</p>

						<div className="flex flex-col sm:flex-row gap-4 mb-12">
							<Button
								size="lg"
								className="h-14 px-8 text-lg"
								onClick={() => router.push("/dashboard")}
							>
								Get Your Clutterscore
								<ArrowRight className="ml-2 h-5 w-5" />
							</Button>
							<Button
								size="lg"
								variant="outline"
								className="h-14 px-8 text-lg bg-background"
							>
								See a Demo
							</Button>
						</div>

						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							<div className="flex -space-x-2">
								{[1, 2, 3, 4].map((i) => (
									<div
										key={i}
										className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold"
									>
										{String.fromCharCode(64 + i)}
									</div>
								))}
							</div>
							<p>Trusted by 500+ messy companies</p>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.7, delay: 0.2 }}
						className="relative"
					>
						<div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-background/50 backdrop-blur-sm">
							<Image
								src={
									"/generated_images/abstract_3d_visualization_of_digital_chaos_becoming_order.png"
								}
								alt="Digital Cleanup Visualization"
								className="w-full h-auto object-cover"
							/>

							{/* Floating UI Elements for Effect */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 1, duration: 0.5 }}
								className="absolute bottom-8 left-8 bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-lg border border-border max-w-[200px]"
							>
								<div className="flex items-center gap-2 mb-2">
									<div className="h-2 w-2 rounded-full bg-destructive"></div>
									<span className="text-xs font-bold uppercase text-muted-foreground">
										Waste Detected
									</span>
								</div>
								<p className="font-mono text-2xl font-bold">
									$47,200
									<span className="text-xs text-muted-foreground font-sans font-normal ml-1">
										/yr
									</span>
								</p>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 1.2, duration: 0.5 }}
								className="absolute top-8 right-8 bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-lg border border-border"
							>
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
										<Sparkles className="h-5 w-5" />
									</div>
									<div>
										<p className="text-sm font-bold">
											Cleanup Complete
										</p>
										<p className="text-xs text-muted-foreground">
											Recovered 4TB space
										</p>
									</div>
								</div>
							</motion.div>
						</div>

						{/* Abstract decoration */}
						<div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-blue-50 to-emerald-50 dark:from-blue-950/20 dark:to-emerald-950/20 rounded-full blur-3xl opacity-60"></div>
					</motion.div>
				</div>
			</section>

			{/* Problem Stats */}
			<section className="py-24 bg-muted/30 border-y border-border/50">
				<div className="container mx-auto px-4">
					<div className="grid md:grid-cols-3 gap-12 text-center">
						<div>
							<h3 className="text-5xl font-display font-bold mb-2 text-primary">
								68%
							</h3>
							<p className="text-lg font-medium mb-2">
								of enterprise storage is dark data
							</p>
							<p className="text-sm text-muted-foreground">
								No one has touched it in years.
							</p>
						</div>
						<div>
							<h3 className="text-5xl font-display font-bold mb-2 text-primary">
								14mo
							</h3>
							<p className="text-lg font-medium mb-2">
								average ghost access retention
							</p>
							<p className="text-sm text-muted-foreground">
								Ex-employees still reading your docs.
							</p>
						</div>
						<div>
							<h3 className="text-5xl font-display font-bold mb-2 text-primary">
								28%
							</h3>
							<p className="text-lg font-medium mb-2">
								of time wasted searching
							</p>
							<p className="text-sm text-muted-foreground">
								{"Where was that file again?"}
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="py-32" id="features">
				<div className="container mx-auto px-4">
					<div className="text-center max-w-3xl mx-auto mb-20">
						<h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
							One dashboard to clean it all.
						</h2>
						<p className="text-xl text-muted-foreground">
							Stop paying for storage you don&apos;t use and SaaS
							seats for people who don&apos;t work there anymore.
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
						{[
							{
								icon: Database,
								title: "Storage & Waste",
								desc: "Instantly identify and delete duplicates, large unused files, and archived projects costing you thousands.",
							},
							{
								icon: Lock,
								title: "Ghost Access",
								desc: "Automatically detect and revoke access for ex-employees and external contractors who left months ago.",
							},
							{
								icon: Search,
								title: "Search Friction",
								desc: "Archive zombie Slack channels and empty Notion pages to make search actually useful again.",
							},
							{
								icon: HardDrive,
								title: "SaaS Sprawl",
								desc: "Identify unused licenses across your stack and cut your monthly burn by 20-30% instantly.",
							},
							{
								icon: Sparkles,
								title: "One-Click Hygiene",
								desc: "Approve AI-suggested cleanup playbooks with a single click. We handle the API heavy lifting.",
							},
							{
								icon: CheckCircle2,
								title: "Audit Log",
								desc: "Every file deleted and permission revoked is logged. Undo any action for up to 30 days.",
							},
						].map((feature, i) => (
							<Card
								key={i}
								className="bg-card border-border/60 hover:border-primary/20 transition-colors"
							>
								<CardHeader>
									<div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
										<feature.icon className="h-6 w-6 text-primary" />
									</div>
									<h3 className="font-display text-xl font-bold">
										{feature.title}
									</h3>
								</CardHeader>
								<CardContent>
									<p className="text-muted-foreground">
										{feature.desc}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* Pricing Section */}
			<section className="py-32 bg-secondary/20" id="pricing">
				<div className="container mx-auto px-4">
					<div className="text-center max-w-3xl mx-auto mb-20">
						<h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
							Simple, predictable pricing.
						</h2>
						<p className="text-xl text-muted-foreground">
							No per-seat pricing. Companies love predictable
							cost.
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
						{/* Free Tier */}
						<Card className="border-border/60 flex flex-col">
							<CardHeader>
								<h3 className="text-2xl font-display font-bold">
									Free
								</h3>
								<p className="text-muted-foreground">
									Viral Engine
								</p>
								<div className="mt-4">
									<span className="text-4xl font-bold">
										$0
									</span>
									<span className="text-muted-foreground">
										/forever
									</span>
								</div>
							</CardHeader>
							<CardContent className="flex-1">
								<ul className="space-y-3">
									{[
										"Full Audit + Clutterscore",
										"PDF Report Export",
										"Watermark on reports",
										"Unlimited scans",
									].map((item, i) => (
										<li
											key={i}
											className="flex items-center gap-2"
										>
											<CheckCircle2 className="h-5 w-5 text-muted-foreground" />
											<span className="text-sm">
												{item}
											</span>
										</li>
									))}
								</ul>
							</CardContent>
							<div className="p-6 pt-0">
								<Button
									variant="outline"
									className="w-full"
									onClick={() => router.push("/dashboard")}
								>
									Start Free Audit
								</Button>
							</div>
						</Card>

						{/* Pro Tier */}
						<Card className="border-primary shadow-lg flex flex-col relative overflow-hidden">
							<div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
								POPULAR
							</div>
							<CardHeader>
								<h3 className="text-2xl font-display font-bold">
									Pro
								</h3>
								<p className="text-muted-foreground">
									Automated Cleanup
								</p>
								<div className="mt-4">
									<span className="text-4xl font-bold">
										$29
									</span>
									<span className="text-muted-foreground">
										/mo per 50 users
									</span>
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									Billed annually ($290)
								</p>
							</CardHeader>
							<CardContent className="flex-1">
								<ul className="space-y-3">
									{[
										"Everything in Free",
										"Automated Cleanups",
										"Full Dashboard Access",
										"Savings Tracker",
										"No Watermark",
									].map((item, i) => (
										<li
											key={i}
											className="flex items-center gap-2"
										>
											<CheckCircle2 className="h-5 w-5 text-primary" />
											<span className="text-sm font-medium">
												{item}
											</span>
										</li>
									))}
								</ul>
							</CardContent>
							<div className="p-6 pt-0">
								<Button
									className="w-full"
									onClick={() => router.push("/dashboard")}
								>
									Get Started
								</Button>
							</div>
						</Card>

						{/* Enterprise Tier */}
						<Card className="border-border/60 flex flex-col">
							<CardHeader>
								<h3 className="text-2xl font-display font-bold">
									Enterprise
								</h3>
								<p className="text-muted-foreground">
									Expert Review
								</p>
								<div className="mt-4">
									<span className="text-4xl font-bold">
										$99
									</span>
									<span className="text-muted-foreground">
										/mo per 50 users
									</span>
								</div>
							</CardHeader>
							<CardContent className="flex-1">
								<ul className="space-y-3">
									{[
										"Everything in Pro",
										"Quarterly Human Expert Review",
										"Priority Support",
										"Custom Playbooks",
										"SLA Guarantee",
									].map((item, i) => (
										<li
											key={i}
											className="flex items-center gap-2"
										>
											<CheckCircle2 className="h-5 w-5 text-muted-foreground" />
											<span className="text-sm">
												{item}
											</span>
										</li>
									))}
								</ul>
							</CardContent>
							<div className="p-6 pt-0">
								<Button
									variant="outline"
									className="w-full"
									onClick={() => router.push("/dashboard")}
								>
									Contact Sales
								</Button>
							</div>
						</Card>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="py-24 bg-primary text-primary-foreground text-center">
				<div className="container mx-auto px-4 max-w-4xl">
					<h2 className="text-4xl md:text-6xl font-display font-bold mb-8">
						Stop drowning in digital trash.
					</h2>
					<p className="text-xl text-primary-foreground/80 mb-12 max-w-2xl mx-auto">
						Get your free audit today. No credit card required.
						We&apos;ll show you exactly how much money you&apos;re
						wasting.
					</p>
					<Button
						size="lg"
						variant="secondary"
						className="h-16 px-10 text-xl font-bold"
						onClick={() => router.push("/dashboard")}
					>
						Start Free Audit
						<ArrowRight className="ml-2 h-6 w-6" />
					</Button>
					<p className="mt-6 text-sm opacity-60">
						Soc2 Type II Certified · Read-only Initial Access
					</p>
				</div>
			</section>
		</div>
	);
}
