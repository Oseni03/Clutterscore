// lib/subscription-plans.ts
import {
	DollarSign,
	Zap,
	Building2,
	Crown,
	type LucideIcon,
} from "lucide-react";

export type BillingInterval = "monthly" | "yearly";

export interface SubscriptionPlan {
	id: string;
	name: string;
	description: string;
	icon: LucideIcon;
	features: string[];
	popular: boolean;
	minUsers: number;
	maxUsers: number;
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
			savings?: string;
		};
	};
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
	{
		id: "free",
		name: "Free",
		description: "One audit per month – See your waste, no cleanup",
		icon: DollarSign,
		minUsers: 0,
		maxUsers: 349,
		features: [
			"1 audit scan per month (throttled)",
			"Clutterscore (0-100) + waste breakdown",
			"Dark data & duplicate detection",
			"Storage cost calculator",
			"PDF export (watermarked)",
			"Read-only dashboard access",
			"No cleanup execution",
		],
		popular: false,
		plans: {
			monthly: {
				price: "$0",
				priceValue: 0,
				period: "/month",
				productId: "",
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
		id: "pro-tier1",
		name: "Pro Tier 1",
		description: "For teams with 350–799 users",
		icon: Zap,
		minUsers: 350,
		maxUsers: 799,
		features: [
			"Unlimited automated cleanups",
			"All integration sources supported",
			"Dark data detection (>12 months)",
			"Duplicate consolidation (hash-based)",
			"Preview & approve cleanup playbooks",
			"30-day undo safety net",
			"Weekly savings reports via email",
			"Priority email support (48h SLA)",
		],
		popular: false,
		plans: {
			monthly: {
				price: "$4,997",
				priceValue: 4997,
				period: "/month",
				productId:
					process.env.NEXT_PUBLIC_PRO_TIER1_MONTHLY_PLAN_ID || "",
			},
			yearly: {
				price: "$59,964",
				priceValue: 59964,
				period: "/year",
				productId:
					process.env.NEXT_PUBLIC_PRO_TIER1_YEARLY_PLAN_ID || "",
				savings: "Founders Circle Locked",
			},
		},
	},
	{
		id: "pro-tier2",
		name: "Pro Tier 2",
		description: "For teams with 800–1,349 users",
		icon: Zap,
		minUsers: 800,
		maxUsers: 1349,
		features: [
			"All Pro Tier 1 features",
			"Enhanced cleanup capacity",
			"Optimized for larger teams",
			"Advanced duplicate detection",
			"Team usage analytics",
			"Custom playbook templates",
			"Slack integration (alerts)",
			"Priority support with 24h response",
		],
		popular: true,
		plans: {
			monthly: {
				price: "$7,997",
				priceValue: 7997,
				period: "/month",
				productId:
					process.env.NEXT_PUBLIC_PRO_TIER2_MONTHLY_PLAN_ID || "",
			},
			yearly: {
				price: "$95,964",
				priceValue: 95964,
				period: "/year",
				productId:
					process.env.NEXT_PUBLIC_PRO_TIER2_YEARLY_PLAN_ID || "",
				savings: "Founders Circle Locked",
			},
		},
	},
	{
		id: "pro-tier3",
		name: "Pro Tier 3",
		description: "For teams with 1,350–2,000 users",
		icon: Building2,
		minUsers: 1350,
		maxUsers: 2000,
		features: [
			"All Pro Tier 2 features",
			"Maximum cleanup capacity",
			"Enterprise-grade performance",
			"Dedicated account manager",
			"Custom onboarding (15-min demo)",
			"Advanced RBAC (role permissions)",
			"Quarterly business reviews",
			"Custom SLA options",
		],
		popular: false,
		plans: {
			monthly: {
				price: "$11,997",
				priceValue: 11997,
				period: "/month",
				productId:
					process.env.NEXT_PUBLIC_PRO_TIER3_MONTHLY_PLAN_ID || "",
			},
			yearly: {
				price: "$143,964",
				priceValue: 143964,
				period: "/year",
				productId:
					process.env.NEXT_PUBLIC_PRO_TIER3_YEARLY_PLAN_ID || "",
				savings: "Founders Circle Locked",
			},
		},
	},
	{
		id: "enterprise",
		name: "Enterprise",
		description: "For organizations with 2,000+ users",
		icon: Crown,
		minUsers: 2001,
		maxUsers: 999999,
		features: [
			"All Pro Tier 3 features",
			"Unlimited user capacity",
			"White-label branding options",
			"Custom contract terms",
			"Dedicated infrastructure",
			"24/7 premium support",
			"Custom integrations",
			"On-premise deployment options",
		],
		popular: false,
		plans: {
			monthly: {
				price: "Custom",
				priceValue: 0,
				period: "",
				productId: "",
				savings: "Contact Sales",
			},
			yearly: {
				price: "Custom",
				priceValue: 0,
				period: "",
				productId: "",
				savings: "Contact Sales",
			},
		},
	},
];

export const FREE_PLAN = SUBSCRIPTION_PLANS[0];

export const getPlan = (planId: string) => {
	return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
};

export const getPlanByTier = (tier: string) => {
	return (
		SUBSCRIPTION_PLANS.find(
			(plan) => plan.id.toLowerCase() === tier.toLowerCase()
		) || FREE_PLAN
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
		if (plan.plans.monthly.productId === productId) return "monthly";
		if (plan.plans.yearly.productId === productId) return "yearly";
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

export const getRecommendedTier = (
	userCount: number
): SubscriptionPlan | null => {
	for (const plan of SUBSCRIPTION_PLANS) {
		if (userCount >= plan.minUsers && userCount <= plan.maxUsers) {
			return plan;
		}
	}
	return null;
};

export const getEligiblePlans = (userCount: number): SubscriptionPlan[] => {
	return SUBSCRIPTION_PLANS.filter(
		(plan) =>
			userCount >= plan.minUsers &&
			userCount <= plan.maxUsers &&
			plan.id !== "free" // Exclude free tier from upgrades
	);
};

export const canUpgradeToPlan = (
	userCount: number,
	planId: string
): boolean => {
	const plan = getPlan(planId);
	if (!plan) return false;
	return userCount >= plan.minUsers && userCount <= plan.maxUsers;
};

export const getEligibleProductIds = (
	userCount: number,
	interval: BillingInterval
): string[] => {
	const eligiblePlans = getEligiblePlans(userCount);
	return eligiblePlans
		.map((plan) => plan.plans[interval].productId)
		.filter(Boolean);
};
