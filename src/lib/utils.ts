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
		features: [
			"1 audit scan per month (throttled)",
			"Clutterscore (0-100) + waste breakdown",
			"Dark data & duplicate detection",
			"Storage cost calculator ($XX,XXX/year)",
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
		description: "For teams with 300–599 Google Workspace users",
		icon: Zap,
		features: [
			"Unlimited automated cleanups",
			"Google Workspace + Dropbox integration",
			"Dark data detection (>12 months)",
			"Duplicate consolidation (hash-based)",
			"Preview & approve cleanup playbooks",
			"30-day undo safety net",
			"Weekly savings reports via email",
			"40% storage reduction guarantee",
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
		description: "For teams with 600–999 Google Workspace users",
		icon: Zap,
		features: [
			"All Pro Tier 1 features",
			"Enhanced cleanup capacity",
			"Optimized for larger teams",
			"Advanced duplicate detection",
			"Team usage analytics",
			"Custom playbook templates",
			"Slack integration (alerts)",
			"40% storage reduction guarantee",
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
		description: "For teams with 1,000–1,500 Google Workspace users",
		icon: Building2,
		features: [
			"All Pro Tier 2 features",
			"Maximum cleanup capacity",
			"Enterprise-grade performance",
			"Dedicated account manager",
			"Custom onboarding (15-min demo)",
			"Advanced RBAC (role permissions)",
			"Quarterly business reviews",
			"Custom SLA options",
			"40% storage reduction guarantee",
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
];

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

type LogSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL" | "SUCCESS";

export function formatTelegramMessage(
	appName: string,
	message: string,
	severity: LogSeverity
) {
	const severityMap: Record<LogSeverity, string> = {
		INFO: "ℹ️ <b>INFO</b>",
		WARNING: "⚠️ <b>WARNING</b>",
		ERROR: "❌ <b>ERROR</b>",
		CRITICAL: "🔥 <b>CRITICAL</b>",
		SUCCESS: "✅ <b>SUCCESS</b>",
	};

	const header = severityMap[severity] ?? "ℹ️ <b>INFO</b>";

	return `
<b>🚀 ${appName}</b>
${header}

<pre>${message}</pre>
  `;
}
