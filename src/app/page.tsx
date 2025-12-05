"use client";

import Hero from "@/components/homepage/hero";
import Stats from "@/components/homepage/stats";
import Features from "@/components/homepage/features";
import Pricing from "@/components/homepage/pricing";
import CTA from "@/components/homepage/CTA";
import Header from "@/components/homepage/header";

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-background font-sans selection:bg-primary selection:text-primary-foreground">
			{/* Navigation – full-width background, content centered */}
			<div className="w-full flex justify-center">
				<div className="w-full max-w-7xl">
					<Header />
				</div>
			</div>

			{/* Hero Section – Perfectly centered */}
			<div className="w-full flex justify-center">
				<div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
					<Hero />
				</div>
			</div>

			{/* Stats – Centered */}
			<div className="w-full flex justify-center">
				<div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
					<Stats />
				</div>
			</div>

			{/* Features – Centered */}
			<div className="w-full flex justify-center">
				<div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
					<Features />
				</div>
			</div>

			{/* Pricing – Centered */}
			<div className="w-full flex justify-center">
				<div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
					<Pricing />
				</div>
			</div>

			{/* Final CTA – Perfectly centered */}
			<div className="w-full flex justify-center">
				<div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
					<CTA />
				</div>
			</div>
		</div>
	);
}
