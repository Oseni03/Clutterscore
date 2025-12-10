import { ToolSource } from "@prisma/client";
import { clsx, type ClassValue } from "clsx";
import {
	Archive,
	Building2,
	Database,
	DollarSign,
	FileText,
	Film,
	ImageIcon,
	LucideIcon,
	Music,
	Zap,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type BillingInterval = "monthly" | "yearly";

export interface SubscriptionPlan {
	id: string;
	name: string;
	description: string;
	icon: LucideIcon;
	features: string[];
	popular: boolean;
	plans: {
		monthly: {
			price: string;
			priceValue: number;
			period: string;
			productId: string;
			savings?: string;
		};
		yearly: {
			price: string;
			priceValue: number;
			period: string;
			productId: string;
			savings?: string; // e.g., "Save 20%"
		};
	};
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
	{
		id: "free",
		name: "Free",
		description: "Read-only audit insights for curious teams",
		icon: DollarSign,
		features: [
			"Read-only access to audit results",
			"View Clutterscore (1-100) and breakdown",
			"See waste, risks, and duplicate analysis",
			"Export reports as PDF",
			"Limited integrations (up to 2 tools)",
			"No cleanup execution",
		],
		popular: false,
		plans: {
			monthly: {
				price: "$0",
				priceValue: 0,
				period: "/month",
				productId: "", // No product ID for free tier
			},
			yearly: {
				price: "$0",
				priceValue: 0,
				period: "/year",
				productId: "",
				savings: "",
			},
		},
	},
	{
		id: "pro",
		name: "Pro",
		description: "Full automation with unlimited cleanups",
		icon: Zap,
		features: [
			"All integrations supported",
			"Unlimited audit runs",
			"Execute cleanup playbooks with approval",
			"One-click automated cleanups",
			"Real-time dashboard with trends",
			"Gamification and leaderboards",
			"Email notifications for risks",
		],
		popular: true,
		plans: {
			monthly: {
				price: "$15",
				priceValue: 15,
				period: "/month",
				productId: process.env.NEXT_PUBLIC_PRO_MONTHLY_PLAN_ID || "",
			},
			yearly: {
				price: "$150",
				priceValue: 150,
				period: "/year",
				productId: process.env.NEXT_PUBLIC_PRO_YEARLY_PLAN_ID || "",
				savings: "Save 17%", // $348/year monthly vs $290/year
			},
		},
	},
	{
		id: "enterprise",
		name: "Enterprise",
		description: "Advanced management for large organizations",
		icon: Building2,
		features: [
			"All Pro features",
			"Organization and membership management",
			"Role-based access control (RBAC)",
			"Automated periodic cleanups (scheduled)",
			"Quarterly expert review sessions",
			"Priority support and onboarding",
			"Custom playbook creation",
			"API access for custom integrations",
			"White-label branding options",
		],
		popular: false,
		plans: {
			monthly: {
				price: "$35",
				priceValue: 35,
				period: "/mo per 50 users",
				productId:
					process.env.NEXT_PUBLIC_ENTERPRISE_MONTHLY_PLAN_ID || "",
			},
			yearly: {
				price: "$350",
				priceValue: 350,
				period: "/yr per 50 users",
				productId:
					process.env.NEXT_PUBLIC_ENTERPRISE_YEARLY_PLAN_ID || "",
				savings: "Save 17%", // $1,188/year monthly vs $990/year
			},
		},
	},
];

export const FREE_PLAN = SUBSCRIPTION_PLANS[0];

export const getPlan = (planId: string) => {
	return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
};

export const getPlanByTier = (tier: string) => {
	return SUBSCRIPTION_PLANS.find(
		(plan) => plan.id.toLowerCase() === tier.toLowerCase() || FREE_PLAN
	);
};

export const getPlanByProductId = (productId: string) => {
	for (const plan of SUBSCRIPTION_PLANS) {
		if (
			plan.plans.monthly.productId === productId ||
			plan.plans.yearly.productId === productId
		) {
			return plan;
		}
	}
	return FREE_PLAN;
};

export const getBillingInterval = (
	productId: string
): BillingInterval | null => {
	for (const plan of SUBSCRIPTION_PLANS) {
		if (plan.plans.monthly.productId === productId) {
			return "monthly";
		}
		if (plan.plans.yearly.productId === productId) {
			return "yearly";
		}
	}
	return null;
};

export const getAllProductIds = (interval?: BillingInterval): string[] => {
	const ids: string[] = [];

	SUBSCRIPTION_PLANS.forEach((plan) => {
		if (!interval || interval === "monthly") {
			if (plan.plans.monthly.productId) {
				ids.push(plan.plans.monthly.productId);
			}
		}
		if (!interval || interval === "yearly") {
			if (plan.plans.yearly.productId) {
				ids.push(plan.plans.yearly.productId);
			}
		}
	});

	return ids.filter(Boolean);
};

export const FILE_TYPE_ICONS = {
	DOCUMENT: FileText,
	IMAGE: ImageIcon,
	VIDEO: Film,
	MUSIC: Music,
	ARCHIVE: Archive,
	DATABASE: Database,
	OTHER: FileText,
};

export const SOURCE_ICONS: Record<ToolSource, string> = {
	SLACK: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/slack.svg",
	GOOGLE: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/google.svg",
	MICROSOFT:
		"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/microsoft.svg",
	NOTION: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/notion.svg",
	DROPBOX:
		"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/dropbox.svg",
	FIGMA: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/figma.svg",
	JIRA: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/jira.svg",
};
