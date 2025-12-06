import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { ConnectorService } from "@/server/connector-service";
import { PlaybookWithItems } from "@/types/audit";
import { mapImpactTypeToActionType } from "./execute-playbook";

/**
 * Automated Playbook Execution Function
 * Runs weekly to automatically execute approved playbooks for cleanup
 *
 * Features:
 * - Filters organizations by subscription tier (pro and enterprise only)
 * - Finds playbooks that haven't been executed or dismissed
 * - Auto-approves low-risk PENDING playbooks
 * - Executes playbooks using ConnectorService
 * - Creates audit logs and notifications
 * - Tracks execution metrics
 */
export const automatedPlaybookExecution = inngest.createFunction(
	{
		id: "automated-playbook-execution",
		name: "Automated Playbook Execution",
		// Run weekly on Sunday at 3 AM UTC
		concurrency: {
			limit: 1,
			key: "event.data.organizationId",
		},
	},
	{ cron: "0 3 * * 0" }, // Weekly on Sunday at 3 AM
	async ({ step }) => {
		const executionResults = {
			organizations: 0,
			playbooksExecuted: 0,
			itemsProcessed: 0,
			itemsFailed: 0,
			totalSavings: 0,
			errors: [] as string[],
		};

		// Step 1: Get all organizations and filter by subscription plan
		const organizations = await step.run("get-organizations", async () => {
			// Get all active organizations
			const allOrgs = await prisma.organization.findMany({
				select: {
					id: true,
					name: true,
					subscriptionTier: true,
				},
			});

			// Filter organizations by permitted subscription tiers (pro and enterprise)
			const permittedOrgs = allOrgs.filter(
				(org) =>
					org.subscriptionTier === "pro" ||
					org.subscriptionTier === "enterprise"
			);

			return permittedOrgs;
		});

		executionResults.organizations = organizations.length;

		// Step 2: Process each organization and get their eligible playbooks
		for (const org of organizations) {
			await step.run(`process-org-${org.id}`, async () => {
				try {
					// Get playbooks for this specific organization that haven't been executed or dismissed
					const playbooks = await prisma.playbook.findMany({
						where: {
							organizationId: org.id,
							status: {
								notIn: ["EXECUTED", "DISMISSED", "FAILED"],
							},
							// Only get playbooks that are either PENDING or APPROVED
							OR: [{ status: "APPROVED" }, { status: "PENDING" }],
						},
						include: {
							items: true,
						},
						orderBy: {
							createdAt: "asc", // Execute oldest first
						},
					});

					if (playbooks.length === 0) {
						return {
							organizationId: org.id,
							playbooksProcessed: 0,
							message: "No eligible playbooks found",
						};
					}

					// Initialize ConnectorService
					const connectorService = new ConnectorService();

					for (const playbook of playbooks) {
						try {
							// Only execute APPROVED playbooks
							// PENDING playbooks can be auto-approved based on criteria
							if (playbook.status === "PENDING") {
								// Auto-approve low-risk playbooks for automated execution
								const shouldAutoApprove =
									shouldAutoApprovePlaybook(playbook);

								if (!shouldAutoApprove) {
									continue; // Skip PENDING playbooks that don't meet auto-approval criteria
								}

								// Auto-approve the playbook
								await prisma.playbook.update({
									where: { id: playbook.id },
									data: { status: "APPROVED" },
								});
							}

							// Update status to executing
							await prisma.playbook.update({
								where: { id: playbook.id },
								data: { status: "EXECUTING" },
							});

							const startTime = Date.now();

							// Execute playbook using ConnectorService
							const { processed, failed } =
								await connectorService.performPlaybookActions(
									playbook
								);

							const executionTime = Date.now() - startTime;

							if (failed > 0) {
								executionResults.errors.push(
									`${failed} items failed in playbook ${playbook.id} (${playbook.title})`
								);
							}

							// Create audit log entry
							await prisma.auditLog.create({
								data: {
									organizationId: org.id,
									playbookId: playbook.id,
									actionType: mapImpactTypeToActionType(
										playbook.impactType
									),
									target: playbook.title,
									targetType: "Playbook",
									executor: "Automated Policy",
									status: failed === 0 ? "SUCCESS" : "FAILED",
									details: {
										itemsProcessed: processed,
										itemsFailed: failed,
										executionTime,
										estimatedSavings:
											playbook.estimatedSavings,
										source: playbook.source,
										automated: true,
									},
									undoActions: [], // Automated executions don't support undo
								},
							});

							// Update playbook status
							await prisma.playbook.update({
								where: { id: playbook.id },
								data: {
									status:
										failed === 0 ? "EXECUTED" : "FAILED",
									executedAt: new Date(),
									executedBy: "system",
									executionTime,
									itemsProcessed: processed,
									itemsFailed: failed,
									actualSavings:
										playbook.estimatedSavings || 0,
								},
							});

							// Update execution results
							executionResults.playbooksExecuted++;
							executionResults.itemsProcessed += processed;
							executionResults.itemsFailed += failed;
							executionResults.totalSavings +=
								playbook.estimatedSavings || 0;

							// Create notification for organization admins
							const admins = await prisma.member.findMany({
								where: {
									organizationId: org.id,
									role: { in: ["ADMIN", "OWNER"] },
								},
								select: { userId: true },
							});

							await prisma.notification.createMany({
								data: admins.map((admin) => ({
									userId: admin.userId,
									type: "PLAYBOOK_READY",
									title: "Automated Cleanup Completed",
									message: `${playbook.title} was executed automatically. ${processed} items processed${failed > 0 ? `, ${failed} failed` : ""}.`,
									actionUrl: `/playbooks/${playbook.id}`,
									metadata: {
										playbookId: playbook.id,
										itemsProcessed: processed,
										itemsFailed: failed,
										savings: playbook.estimatedSavings,
										automated: true,
									},
								})),
							});

							// Update audit result if exists
							if (playbook.auditResultId) {
								const currentAudit =
									await prisma.auditResult.findUnique({
										where: { id: playbook.auditResultId },
									});

								if (currentAudit) {
									await prisma.auditResult.update({
										where: { id: playbook.auditResultId },
										data: {
											estimatedSavings: Math.max(
												0,
												currentAudit.estimatedSavings -
													(playbook.estimatedSavings ||
														0)
											),
											activeRisks: Math.max(
												0,
												currentAudit.activeRisks -
													processed
											),
										},
									});
								}
							}

							// Record activity
							await prisma.activity.create({
								data: {
									organizationId: org.id,
									action: "playbook.auto_executed",
									metadata: {
										playbookId: playbook.id,
										playbookTitle: playbook.title,
										itemsProcessed: processed,
										itemsFailed: failed,
										savings: playbook.estimatedSavings,
										executionTime,
									},
								},
							});
						} catch (error) {
							executionResults.errors.push(
								`Failed to execute playbook ${playbook.id} (${playbook.title}): ${(error as Error).message}`
							);

							// Mark playbook as failed
							await prisma.playbook.update({
								where: { id: playbook.id },
								data: {
									status: "FAILED",
									executedAt: new Date(),
									executedBy: "system",
								},
							});

							// Log the failure
							await prisma.auditLog.create({
								data: {
									organizationId: org.id,
									playbookId: playbook.id,
									actionType: "OTHER",
									target: playbook.title,
									targetType: "Playbook",
									executor: "Automated Policy",
									status: "FAILED",
									details: {
										error:
											(error as Error).message ||
											"Unknown error",
										automated: true,
									},
								},
							});
						}
					}

					return {
						organizationId: org.id,
						playbooksProcessed: playbooks.length,
					};
				} catch (error) {
					executionResults.errors.push(
						`Failed to process organization ${org.id}: ${(error as Error).message}`
					);
					throw error;
				}
			});
		}

		// Step 3: Send summary notification to system admins if there were errors
		if (executionResults.errors.length > 0) {
			await step.run("notify-system-admins", async () => {
				const systemAdmins = await prisma.member.findMany({
					where: {
						role: "OWNER",
					},
					select: { userId: true },
				});

				if (systemAdmins.length > 0) {
					await prisma.notification.createMany({
						data: systemAdmins.map((admin) => ({
							userId: admin.userId,
							type: "INTEGRATION_ERROR",
							title: "Automated Playbook Execution Errors",
							message: `${executionResults.errors.length} errors occurred during automated playbook execution.`,
							metadata: {
								errors: executionResults.errors.slice(0, 10), // Limit to first 10
								totalErrors: executionResults.errors.length,
								timestamp: new Date().toISOString(),
								summary: executionResults,
							},
						})),
					});
				}

				return { notified: systemAdmins.length };
			});
		}

		// Step 4: Create summary activity log
		await step.run("log-summary", async () => {
			if (executionResults.organizations > 0) {
				// Log to first organization with activity (or create a system-level log)
				const firstOrg = organizations[0];
				if (firstOrg) {
					await prisma.activity.create({
						data: {
							organizationId: firstOrg.id,
							action: "system.automated_execution_summary",
							metadata: {
								...executionResults,
								timestamp: new Date().toISOString(),
							},
						},
					});
				}
			}
		});

		return {
			success: true,
			summary: executionResults,
			timestamp: new Date().toISOString(),
		};
	}
);

/**
 * Determine if a PENDING playbook should be auto-approved for execution
 */
function shouldAutoApprovePlaybook(playbook: PlaybookWithItems): boolean {
	// Auto-approve criteria:
	// 1. Low risk level (LOW or MEDIUM)
	// 2. Efficiency improvements (not security or high-value savings)
	// 3. Small number of items (< 10)
	// 4. Specific safe action types

	// Only auto-approve LOW risk playbooks
	if (playbook.riskLevel !== "LOW") {
		return false;
	}

	// Only auto-approve efficiency improvements
	if (playbook.impactType !== "EFFICIENCY") {
		return false;
	}

	// Only auto-approve if items count is small
	if (playbook.itemsCount > 10) {
		return false;
	}

	// Check if all items are safe types for auto-execution
	const safeItemTypes = ["channel", "file"]; // Only channels and files
	const allItemsSafe = playbook.items.every((item) =>
		safeItemTypes.includes(item.itemType)
	);

	if (!allItemsSafe) {
		return false;
	}

	return true;
}

/**
 * Manual Playbook Execution Trigger
 * Can be invoked manually for specific playbooks
 */
export const manualPlaybookExecution = inngest.createFunction(
	{
		id: "manual-playbook-execution",
		name: "Manual Playbook Execution",
	},
	{ event: "playbook/execute" },
	async ({ event, step }) => {
		const { playbookId, userId } = event.data;

		const result = await step.run("execute-playbook", async () => {
			const playbook = await prisma.playbook.findUnique({
				where: { id: playbookId },
				include: {
					items: true,
					organization: true,
				},
			});

			if (!playbook) {
				throw new Error("Playbook not found");
			}

			if (
				playbook.status !== "APPROVED" &&
				playbook.status !== "PENDING"
			) {
				throw new Error("Playbook must be approved before execution");
			}

			// Update status to executing
			await prisma.playbook.update({
				where: { id: playbookId },
				data: { status: "EXECUTING" },
			});

			const startTime = Date.now();

			// Execute using ConnectorService
			const connectorService = new ConnectorService();
			const { processed, failed } =
				await connectorService.performPlaybookActions(playbook);

			const executionTime = Date.now() - startTime;

			// Create audit log
			await prisma.auditLog.create({
				data: {
					organizationId: playbook.organizationId,
					playbookId: playbook.id,
					userId,
					actionType: mapImpactTypeToActionType(playbook.impactType),
					target: playbook.title,
					targetType: "Playbook",
					executor: userId ? "Admin (Manual)" : "System",
					status: failed === 0 ? "SUCCESS" : "FAILED",
					details: {
						itemsProcessed: processed,
						itemsFailed: failed,
						executionTime,
						estimatedSavings: playbook.estimatedSavings,
						manual: true,
					},
					undoActions: [], // Manual executions could support undo in future
					undoExpiresAt: userId
						? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
						: null, // 30 days
				},
			});

			// Update playbook
			await prisma.playbook.update({
				where: { id: playbookId },
				data: {
					status: failed === 0 ? "EXECUTED" : "FAILED",
					executedAt: new Date(),
					executedBy: userId || "system",
					executionTime,
					itemsProcessed: processed,
					itemsFailed: failed,
					actualSavings: playbook.estimatedSavings || 0,
				},
			});

			// Log activity
			await prisma.activity.create({
				data: {
					organizationId: playbook.organizationId,
					userId,
					action: "playbook.manual_executed",
					metadata: {
						playbookId: playbook.id,
						title: playbook.title,
						itemsProcessed: processed,
						itemsFailed: failed,
					},
				},
			});

			return {
				playbookId,
				itemsProcessed: processed,
				itemsFailed: failed,
				executionTime,
			};
		});

		return {
			success: true,
			result,
			timestamp: new Date().toISOString(),
		};
	}
);
