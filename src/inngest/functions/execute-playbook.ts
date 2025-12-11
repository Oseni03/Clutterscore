import { inngest } from "../client";
import { ConnectorService } from "@/server/connector-service";
import { prisma } from "@/lib/prisma";
import { PlaybookWithItems } from "@/types/audit";
import { AuditLogActionType } from "@prisma/client";

const connectorService = new ConnectorService();

export const executePlaybookJob = inngest.createFunction(
	{
		id: "execute-playbook",
		name: "Execute Playbook Actions",
		retries: 1, // Only retry once for playbook execution
	},
	{ event: "playbook/execute" },
	async ({ event, step }) => {
		const { playbookId, userId, organizationId } = event.data;

		// Step 1: Validate playbook
		const playbook = await step.run("validate-playbook", async () => {
			const pb = await prisma.playbook.findUnique({
				where: { id: playbookId },
				include: {
					items: true,
					organization: true,
				},
			});

			if (!pb) {
				throw new Error("Playbook not found");
			}

			if (pb.status !== "PENDING" && pb.status !== "APPROVED") {
				throw new Error(
					`Playbook cannot be executed (status: ${pb.status})`
				);
			}

			return pb;
		});

		// Step 2: Mark as executing
		await step.run("mark-executing", async () => {
			await prisma.playbook.update({
				where: { id: playbookId },
				data: { status: "EXECUTING" },
			});
		});

		const startTime = Date.now();

		// Step 3: Execute playbook actions
		const executionResult = await step.run("execute-actions", async () => {
			try {
				return await connectorService.performPlaybookActions(
					playbook as unknown as PlaybookWithItems,
					userId
				);
			} catch (error) {
				// If execution fails, mark as failed
				await prisma.playbook.update({
					where: { id: playbookId },
					data: {
						status: "FAILED",
						executedAt: new Date(),
						executedBy: userId,
					},
				});
				throw error;
			}
		});

		const executionTime = Date.now() - startTime;

		// Step 4: Create audit log
		await step.run("create-audit-log", async () => {
			await prisma.auditLog.create({
				data: {
					organizationId,
					playbookId,
					userId,
					actionType: mapImpactTypeToActionType(playbook.impactType),
					target: playbook.title,
					targetType: "Playbook",
					executor: `User ${userId}`,
					status: "SUCCESS",
					details: {
						itemsProcessed: executionResult.processed,
						itemsFailed: executionResult.failed,
						executionTime,
					},
				},
			});
		});

		// Step 5: Update playbook with results
		await step.run("update-playbook-status", async () => {
			await prisma.playbook.update({
				where: { id: playbookId },
				data: {
					status: "EXECUTED",
					executedAt: new Date(),
					executedBy: userId,
					executionTime,
					itemsProcessed: executionResult.processed,
					itemsFailed: executionResult.failed,
				},
			});
		});

		// Step 6: Log activity
		await step.run("log-activity", async () => {
			await prisma.activity.create({
				data: {
					organizationId,
					userId,
					action: "playbook.executed",
					metadata: {
						playbookId,
						title: playbook.title,
						itemsProcessed: executionResult.processed,
						itemsFailed: executionResult.failed,
						executionTime,
					},
				},
			});
		});

		// Step 7: Send notification
		await step.run("send-notification", async () => {
			await prisma.notification.create({
				data: {
					userId,
					type: "AUDIT_COMPLETE",
					title: "Playbook Executed Successfully",
					message: `${playbook.title} completed: ${executionResult.processed} items processed${executionResult.failed > 0 ? `, ${executionResult.failed} failed` : ""}`,
					actionUrl: `/dashboard/playbooks/${playbookId}`,
				},
			});
		});

		return {
			playbookId,
			success: true,
			itemsProcessed: executionResult.processed,
			itemsFailed: executionResult.failed,
			executionTime,
		};
	}
);

export function mapImpactTypeToActionType(
	impactType: string
): AuditLogActionType {
	switch (impactType) {
		case "SECURITY":
			return "REVOKE_ACCESS";
		case "SAVINGS":
			return "ARCHIVE_FILE";
		case "EFFICIENCY":
			return "ARCHIVE_CHANNEL";
		default:
			return "OTHER";
	}
}
