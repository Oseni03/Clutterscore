import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";
import { buttonVariants } from "../ui/button";
import { ArrowRight } from "lucide-react";

function CTA() {
	return (
		<section className="py-24 bg-night text-paper text-center">
			<div className="container mx-auto px-4 max-w-4xl">
				<h2 className="text-4xl md:text-h2 font-display font-semibold mb-8">
					Stop drowning in digital trash.
				</h2>
				<p className="text-lead text-paper/70 mb-12 max-w-2xl mx-auto">
					Get your free audit today. No credit card required.
					We&apos;ll show you exactly how much money you&apos;re
					wasting.
				</p>
				<Link
					href={"/dashboard"}
					className={cn(
						buttonVariants({
							variant: "accent",
							size: "lg",
						})
					)}
				>
					Start Free Audit
					<ArrowRight className="ml-3 h-6 w-6" />
				</Link>
			</div>
		</section>
	);
}

export default CTA;
