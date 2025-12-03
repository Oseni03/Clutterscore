import { clsx, type ClassValue } from "clsx";
import { Building2, DollarSign, Zap } from "lucide-react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const SUBSCRIPTION_PLANS = [
	{
		id: "free",
		name: "Free",
		description: "Audit + report only (viral hook)",
		price: "$0",
		period: "/month",
		icon: DollarSign,
		features: [
			"Instant audit with Clutterscore (1-100)",
			"Breakdown of waste, risks, and duplicates",
			"Watermarked PDF report export",
			"Limited integrations (up to 3 tools)",
		],
		popular: false,
		productId: process.env.POLAR_SOLO_PLAN_ID || "",
	},
	{
		id: "pro",
		name: "Pro",
		description: "Automated cleanups + dashboard for growing teams",
		price: "$29",
		period: "/mo per 50 users",
		icon: Zap,
		features: [
			"All Free features",
			"Unlimited integrations",
			"One-click cleanup playbooks with preview/approval",
			"Ongoing dashboard with trends, leaderboards, and gamification",
			"Recurring automated audits",
			"Undo actions (30 days)",
		],
		popular: true,
		productId: process.env.POLAR_ENTREPRENEUR_PLAN_ID || "",
	},
	{
		id: "enterprise",
		name: "Enterprise",
		description: "Expert support for larger organizations",
		price: "$99",
		period: "/mo per 50 users",
		icon: Building2,
		features: [
			"All Pro features",
			"Quarterly human expert review",
			"Priority support",
			"Custom playbooks",
			"API access for integrations",
			"White-label options",
		],
		popular: false,
		productId: process.env.POLAR_MULTIPRENEUR_PLAN_ID || "",
	},
];

export const FREE_PLAN = SUBSCRIPTION_PLANS.at(0);

export const getPlan = (planId: string) => {
	return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
};

export const getPlanByProductId = (productId: string) => {
	return (
		SUBSCRIPTION_PLANS.find((plan) => plan.productId === productId) ||
		FREE_PLAN
	);
};
