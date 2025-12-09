/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebhookEvent, WebhookHandler } from "./types";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";
import { logger } from "../logger";

export class NotionWebhookHandler implements WebhookHandler {
	async verify(req: Request): Promise<boolean> {
		// Notion uses HMAC-SHA256 signature verification
		const signature = req.headers.get("notion-signature");
		if (!signature) return false;

		const webhookSecret = process.env.NOTION_WEBHOOK_SECRET;
		if (!webhookSecret) {
			logger.error("NOTION_WEBHOOK_SECRET not configured");
			return false;
		}

		try {
			const body = await req.text();
			const timestamp = req.headers.get("notion-timestamp");

			// Notion includes timestamp in signature to prevent replay attacks
			const payload = `${timestamp}.${body}`;
			const hmac = createHmac("sha256", webhookSecret);
			hmac.update(payload);
			const expectedSignature = hmac.digest("hex");

			// Check timestamp to prevent replay attacks (5 min window)
			const requestTime = parseInt(timestamp || "0");
			const currentTime = Math.floor(Date.now() / 1000);
			if (Math.abs(currentTime - requestTime) > 300) {
				logger.error(
					"NOTION_WEBHOOK_HANDLER - Notion webhook timestamp too old"
				);
				return false;
			}

			// Timing-safe comparison to prevent timing attacks
			return timingSafeEqual(
				Buffer.from(signature),
				Buffer.from(expectedSignature)
			);
		} catch (error) {
			logger.error(
				"NOTION_WEBHOOK_HANDLER - Notion webhook verification failed:",
				error
			);
			return false;
		}
	}

	async handle(event: WebhookEvent): Promise<void> {
		const { eventType, data } = event;

		switch (eventType) {
			case "page":
				await this.handlePageEvent(data);
				break;

			case "database":
				await this.handleDatabaseEvent(data);
				break;

			case "block":
				await this.handleBlockEvent(data);
				break;

			case "user":
				await this.handleUserEvent(data);
				break;

			case "workspace":
				await this.handleWorkspaceEvent(data);
				break;

			default:
				logger.warn(
					`NOTION_WEBHOOK_HANDLER - Unhandled Notion event: ${eventType}`
				);
		}
	}

	private async handlePageEvent(data: any): Promise<void> {
		const { action, data: pageData, workspace_id: workspaceId } = data;

		// Find integration by Notion workspace ID
		const integration = await prisma.toolIntegration.findFirst({
			where: {
				source: "NOTION",
				metadata: {
					path: ["workspaceId"],
					equals: workspaceId,
				},
			},
		});

		if (!integration) return;

		const actionMap: Record<string, string> = {
			created: "webhook.page_created",
			updated: "webhook.page_updated",
			deleted: "webhook.page_deleted",
			restored: "webhook.page_restored",
		};

		await prisma.activity.create({
			data: {
				organizationId: integration.organizationId,
				action: actionMap[action] || "webhook.page_changed",
				metadata: {
					source: "NOTION",
					pageId: pageData.id,
					title: this.extractTitle(pageData.properties),
					parent: pageData.parent,
					lastEditedBy: pageData.last_edited_by?.id,
					lastEditedTime: pageData.last_edited_time,
					action,
				},
			},
		});

		// If page was deleted, mark for cleanup in next audit
		if (action === "deleted") {
			await this.markForCleanup(integration.organizationId, pageData.id);
		}
	}

	private async handleDatabaseEvent(data: any): Promise<void> {
		const { action, data: dbData, workspace_id: workspaceId } = data;

		const integration = await prisma.toolIntegration.findFirst({
			where: {
				source: "NOTION",
				metadata: {
					path: ["workspaceId"],
					equals: workspaceId,
				},
			},
		});

		if (!integration) return;

		const actionMap: Record<string, string> = {
			created: "webhook.database_created",
			updated: "webhook.database_updated",
			deleted: "webhook.database_deleted",
		};

		await prisma.activity.create({
			data: {
				organizationId: integration.organizationId,
				action: actionMap[action] || "webhook.database_changed",
				metadata: {
					source: "NOTION",
					databaseId: dbData.id,
					title: this.extractTitle(dbData.properties),
					parent: dbData.parent,
					lastEditedBy: dbData.last_edited_by?.id,
					action,
				},
			},
		});
	}

	private async handleBlockEvent(data: any): Promise<void> {
		const { action, data: blockData, workspace_id: workspaceId } = data;

		const integration = await prisma.toolIntegration.findFirst({
			where: {
				source: "NOTION",
				metadata: {
					path: ["workspaceId"],
					equals: workspaceId,
				},
			},
		});

		if (!integration) return;

		// Track block changes for content activity metrics
		await prisma.activity.create({
			data: {
				organizationId: integration.organizationId,
				action: "webhook.block_changed",
				metadata: {
					source: "NOTION",
					blockId: blockData.id,
					type: blockData.type,
					parentId: blockData.parent,
					lastEditedBy: blockData.last_edited_by?.id,
					action,
				},
			},
		});
	}

	private async handleUserEvent(data: any): Promise<void> {
		const { action, data: userData, workspace_id: workspaceId } = data;

		const integration = await prisma.toolIntegration.findFirst({
			where: {
				source: "NOTION",
				metadata: {
					path: ["workspaceId"],
					equals: workspaceId,
				},
			},
		});

		if (!integration) return;

		// Track user additions/removals for license auditing
		const actionMap: Record<string, string> = {
			added: "webhook.user_added",
			removed: "webhook.user_removed",
			updated: "webhook.user_updated",
		};

		await prisma.activity.create({
			data: {
				organizationId: integration.organizationId,
				action: actionMap[action] || "webhook.user_changed",
				metadata: {
					source: "NOTION",
					userId: userData.id,
					email: userData.person?.email,
					name: userData.name,
					type: userData.type, // person, bot
					action,
				},
			},
		});

		// Trigger license audit if user was added/removed
		if (action === "added" || action === "removed") {
			await this.triggerLicenseAudit(integration.organizationId);
		}
	}

	private async handleWorkspaceEvent(data: any): Promise<void> {
		const { action, data: workspaceData, workspace_id: workspaceId } = data;

		const integration = await prisma.toolIntegration.findFirst({
			where: {
				source: "NOTION",
				metadata: {
					path: ["workspaceId"],
					equals: workspaceId,
				},
			},
		});

		if (!integration) return;

		// Track workspace-level changes (settings, plan changes, etc.)
		await prisma.activity.create({
			data: {
				organizationId: integration.organizationId,
				action: "webhook.workspace_changed",
				metadata: {
					source: "NOTION",
					workspaceId: workspaceData.id,
					name: workspaceData.name,
					icon: workspaceData.icon,
					domain: workspaceData.domain,
					action,
				},
			},
		});

		// If plan changed, trigger full audit to recalculate metrics
		if (action === "updated" && workspaceData.plan) {
			await this.triggerFullAudit(integration.organizationId);
		}
	}

	private extractTitle(properties: any): string {
		// Notion titles can be in different property types
		if (!properties) return "Untitled";

		// Look for title property
		for (const [, prop] of Object.entries(properties) as any) {
			if (prop.type === "title" && prop.title?.[0]?.plain_text) {
				return prop.title[0].plain_text;
			}
		}

		return "Untitled";
	}

	private async markForCleanup(
		organizationId: string,
		pageId: string
	): Promise<void> {
		// Store deleted page for potential cleanup playbook
		await prisma.activity.create({
			data: {
				organizationId,
				action: "webhook.page_deleted_cleanup",
				metadata: {
					source: "NOTION",
					pageId,
					markedForCleanup: true,
					cleanupEligibleAt: new Date(
						Date.now() + 30 * 24 * 60 * 60 * 1000
					), // 30 days
				},
			},
		});
	}

	private async triggerLicenseAudit(organizationId: string): Promise<void> {
		// Mark integration for re-sync to update license counts
		await prisma.toolIntegration.updateMany({
			where: {
				organizationId,
				source: "NOTION",
				isActive: true,
			},
			data: {
				syncStatus: "IDLE", // Reset to trigger next scheduled sync
				lastSyncedAt: new Date(),
			},
		});
	}

	private async triggerFullAudit(organizationId: string): Promise<void> {
		// Trigger a full audit to recalculate all metrics
		await prisma.toolIntegration.updateMany({
			where: {
				organizationId,
				source: "NOTION",
				isActive: true,
			},
			data: {
				syncStatus: "IDLE",
				lastSyncedAt: null, // Force full resync
			},
		});

		await prisma.activity.create({
			data: {
				organizationId,
				action: "audit.triggered_by_webhook",
				metadata: {
					source: "NOTION",
					reason: "workspace_plan_changed",
					triggeredAt: new Date(),
				},
			},
		});
	}
}
