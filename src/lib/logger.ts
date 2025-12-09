/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/logger.ts
import { sendTelegramMessage } from "@/lib/telegram";
import { APP_NAME } from "@/lib/config";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

// type LogLevel = "error" | "warn" | "info" | "debug";

interface LogContext {
	userId?: string;
	organizationId?: string;
	action?: string;
	[key: string]: any;
}

class Logger {
	private appName: string;

	constructor(appName: string = APP_NAME) {
		this.appName = appName;
	}

	/**
	 * Log error - Console in dev, Telegram in prod
	 */
	async error(message: string, error?: any, context?: LogContext) {
		if (isDevelopment) {
			console.error(`🔴 [ERROR] ${message}`, {
				error: error?.message,
				stack: error?.stack,
				...context,
			});
			return;
		}

		if (isProduction) {
			// Log to console for server logs
			console.error(`[ERROR] ${message}`, error?.message);

			// Send to Telegram
			try {
				const telegramMessage = this.formatTelegramError(
					message,
					error,
					context
				);
				await sendTelegramMessage(telegramMessage);
			} catch (telegramError) {
				// Fail silently to avoid logging loops
				console.error(
					"Failed to send error to Telegram:",
					telegramError
				);
			}
		}
	}

	/**
	 * Log warning - Console in dev, Telegram in prod (only critical warnings)
	 */
	async warn(message: string, context?: LogContext) {
		if (isDevelopment) {
			console.warn(`🟡 [WARN] ${message}`, context);
			return;
		}

		if (isProduction) {
			console.warn(`[WARN] ${message}`);

			// Only send critical warnings to Telegram
			if (context?.critical) {
				try {
					const telegramMessage = this.formatTelegramWarning(
						message,
						context
					);
					await sendTelegramMessage(telegramMessage);
				} catch (telegramError) {
					console.error(
						"Failed to send warning to Telegram:",
						telegramError
					);
				}
			}
		}
	}

	/**
	 * Log info - Console in dev, suppressed in prod
	 */
	info(message: string, context?: LogContext) {
		if (isDevelopment) {
			console.info(`🔵 [INFO] ${message}`, context);
		}

		if (isProduction) {
			// Only log to server console, don't spam Telegram
			console.info(`[INFO] ${message}`);
		}
	}

	/**
	 * Log debug - Console in dev only
	 */
	debug(message: string, context?: LogContext) {
		if (isDevelopment) {
			console.debug(`⚪ [DEBUG] ${message}`, context);
		}
	}

	/**
	 * Log success - Console with green checkmark
	 */
	success(message: string, context?: LogContext) {
		if (isDevelopment) {
			console.log(`✅ [SUCCESS] ${message}`, context);
		}

		if (isProduction) {
			console.log(`[SUCCESS] ${message}`);
		}
	}

	/**
	 * Format error message for Telegram
	 */
	private formatTelegramError(
		message: string,
		error?: Error,
		context?: LogContext
	): string {
		const timestamp = new Date().toISOString();
		const errorDetails = error
			? `
<b>Error:</b> ${this.escapeHtml(error.message)}

<b>Stack:</b>
<pre>${this.escapeHtml(error.stack?.slice(0, 500) || "No stack trace")}</pre>`
			: "";

		const contextDetails = context
			? `
<b>Context:</b>
<pre>${this.escapeHtml(JSON.stringify(context, null, 2).slice(0, 300))}</pre>`
			: "";

		return `
🚨 <b>Error in ${this.escapeHtml(this.appName)}</b>

<b>Time:</b> ${timestamp}
<b>Message:</b> ${this.escapeHtml(message)}
${errorDetails}
${contextDetails}
    `.trim();
	}

	/**
	 * Format warning message for Telegram
	 */
	private formatTelegramWarning(
		message: string,
		context?: LogContext
	): string {
		const timestamp = new Date().toISOString();
		const contextDetails = context
			? `
<b>Context:</b>
<pre>${this.escapeHtml(JSON.stringify(context, null, 2).slice(0, 300))}</pre>`
			: "";

		return `
⚠️ <b>Warning in ${this.escapeHtml(this.appName)}</b>

<b>Time:</b> ${timestamp}
<b>Message:</b> ${this.escapeHtml(message)}
${contextDetails}
    `.trim();
	}

	/**
	 * Escape HTML for Telegram
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}
}

// Export singleton instance
export const logger = new Logger();

// Export for BetterAuth integration
export const createAuthLogger = () => ({
	error: (message: string, error?: Error) => {
		logger.error(`[Auth] ${message}`, error);
	},
	warn: (message: string) => {
		logger.warn(`[Auth] ${message}`);
	},
	info: (message: string) => {
		logger.info(`[Auth] ${message}`);
	},
	debug: (message: string) => {
		logger.debug(`[Auth] ${message}`);
	},
});
