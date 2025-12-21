import { ToolSource } from "@prisma/client";
import { clsx, type ClassValue } from "clsx";
import {
	Archive,
	Database,
	FileText,
	Film,
	ImageIcon,
	Music,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

export const formatSize = (sizeMb: number) => {
	if (sizeMb < 1) return `${(sizeMb * 1024).toFixed(0)} KB`;
	if (sizeMb > 1024) return `${(sizeMb / 1024).toFixed(2)} GB`;
	if (sizeMb > 1024 * 2) return `${(sizeMb / 1024).toFixed(2)} TB`;
	return `${sizeMb.toFixed(2)} MB`;
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
