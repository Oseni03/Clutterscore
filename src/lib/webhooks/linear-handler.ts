/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebhookEvent, WebhookHandler } from "./types";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";
import { logger } from "../logger";

export class LinearWebhookHandler implements WebhookHandler {
	async verify(req: Request): Promise<boolean> {
		// Linear uses HMAC-SHA256 signature verification
		const signature = req.headers.get("linear-signature");
		if (!signature) return false;

		const webhookSecret = process.env.LINEAR_WEBHOOK_SECRET;
		if (!webhookSecret) {
			logger.error("LINEAR_WEBHOOK_SECRET not configured");
			return false;
		}

		try {
			const body = await req.text();
			const hmac = createHmac("sha256", webhookSecret);
			hmac.update(body);
			const expectedSignature = hmac.digest("hex");

			// Timing-safe comparison to prevent timing attacks
			return timingSafeEqual(
				Buffer.from(signature),
				Buffer.from(expectedSignature)
			);
		} catch (error) {
			logger.error("Linear webhook verification failed:", error);
			return false;
		}
	}

	async handle(event: WebhookEvent): Promise<void> {
		const { eventType, data } = event;

		switch (eventType) {
			case "Issue":
				await this.handleIssueEvent(data);
				break;

			case "Project":
				await this.handleProjectEvent(data);
				break;

			case "User":
				await this.handleUserEvent(data);
				break;

			case "Team":
				await this.handleTeamEvent(data);
				break;

			case "Comment":
				await this.handleCommentEvent(data);
				break;

			default:
				logger.info(`Unhandled Linear event: ${eventType}`);
		}
	}

	private async handleIssueEvent(data: any): Promise<void> {
		const { action, data: issueData, organizationId: linearOrgId } = data;

		// Find integration by Linear organization ID
		const integration = await prisma.toolIntegration.findFirst({
			where: {
				source: "LINEAR",
				metadata: {
					path: ["organizationId"],
					equals: linearOrgId,
				},
			},
		});

		if (!integration) return;

		const actionMap: Record<string, string> = {
			create: "webhook.issue_created",
			update: "webhook.issue_updated",
			remove: "webhook.issue_deleted",
		};

		await prisma.activity.create({
			data: {
				organizationId: integration.organizationId,
				action: actionMap[action] || "webhook.issue_changed",
				metadata: {
					source: "LINEAR",
					issueId: issueData.id,
					issueKey: issueData.identifier,
					title: issueData.title,
					state: issueData.state?.name,
					assignee: issueData.assignee?.email,
					action,
				},
			},
		});
	}

	private async handleProjectEvent(data: any): Promise<void> {
		const { action, data: projectData, organizationId: linearOrgId } = data;

		const integration = await prisma.toolIntegration.findFirst({
			where: {
				source: "LINEAR",
				metadata: {
					path: ["organizationId"],
					equals: linearOrgId,
				},
			},
		});

		if (!integration) return;

		const actionMap: Record<string, string> = {
			create: "webhook.project_created",
			update: "webhook.project_updated",
			remove: "webhook.project_deleted",
		};

		await prisma.activity.create({
			data: {
				organizationId: integration.organizationId,
				action: actionMap[action] || "webhook.project_changed",
				metadata: {
					source: "LINEAR",
					projectId: projectData.id,
					name: projectData.name,
					state: projectData.state,
					action,
				},
			},
		});
	}

	private async handleUserEvent(data: any): Promise<void> {
		const { action, data: userData, organizationId: linearOrgId } = data;

		const integration = await prisma.toolIntegration.findFirst({
			where: {
				source: "LINEAR",
				metadata: {
					path: ["organizationId"],
					equals: linearOrgId,
				},
			},
		});

		if (!integration) return;

		// Track user additions/removals for license auditing
		if (action === "create" || action === "remove") {
			await prisma.activity.create({
				data: {
					organizationId: integration.organizationId,
					action:
						action === "create"
							? "webhook.user_added"
							: "webhook.user_removed",
					metadata: {
						source: "LINEAR",
						userId: userData.id,
						email: userData.email,
						name: userData.name,
						isActive: userData.active,
						action,
					},
				},
			});

			// Trigger license audit if user was added/removed
			await this.triggerLicenseAudit(integration.organizationId);
		}
	}

	private async handleTeamEvent(data: any): Promise<void> {
		const { action, data: teamData, organizationId: linearOrgId } = data;

		const integration = await prisma.toolIntegration.findFirst({
			where: {
				source: "LINEAR",
				metadata: {
					path: ["organizationId"],
					equals: linearOrgId,
				},
			},
		});

		if (!integration) return;

		await prisma.activity.create({
			data: {
				organizationId: integration.organizationId,
				action: "webhook.team_changed",
				metadata: {
					source: "LINEAR",
					teamId: teamData.id,
					name: teamData.name,
					key: teamData.key,
					action,
				},
			},
		});
	}

	private async handleCommentEvent(data: any): Promise<void> {
		const { action, data: commentData, organizationId: linearOrgId } = data;

		const integration = await prisma.toolIntegration.findFirst({
			where: {
				source: "LINEAR",
				metadata: {
					path: ["organizationId"],
					equals: linearOrgId,
				},
			},
		});

		if (!integration) return;

		// Track comment activity for engagement metrics
		await prisma.activity.create({
			data: {
				organizationId: integration.organizationId,
				action: "webhook.comment_added",
				metadata: {
					source: "LINEAR",
					commentId: commentData.id,
					issueId: commentData.issue?.id,
					userId: commentData.user?.id,
					userEmail: commentData.user?.email,
					action,
				},
			},
		});
	}

	private async triggerLicenseAudit(organizationId: string): Promise<void> {
		// Mark integration for re-sync to update license counts
		await prisma.toolIntegration.updateMany({
			where: {
				organizationId,
				source: "LINEAR",
				isActive: true,
			},
			data: {
				syncStatus: "IDLE", // Reset to trigger next scheduled sync
				lastSyncedAt: new Date(),
			},
		});
	}
}
