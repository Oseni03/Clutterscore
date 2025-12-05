import React from "react";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "../ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

function Hero() {
	return (
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
						Launch Special: 40% off lifetime (First 500 companies)
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
						cleans your entire digital workspace. We&apos;ll prove
						it in 90 seconds.
					</p>

					<div className="flex flex-col sm:flex-row gap-4 mb-12">
						<Link
							href={"/dashboard"}
							className={cn(
								buttonVariants({
									variant: "default",
									size: "lg",
								}),
								"h-14 px-8 text-lg font-semibold"
							)}
						>
							Get Your Clusterscore
							<ArrowRight className="ml-2 h-5 w-5" />
						</Link>
						<Button
							size="lg"
							variant="outline"
							className="h-14 px-8 text-lg"
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
							width={2400}
							height={1600}
							className="w-full max-w-2xl h-auto object-cover"
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
	);
}

export default Hero;
