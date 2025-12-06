import { inngest } from "../client";
import { ConnectorService } from "@/server/connector-service";
import { prisma } from "@/lib/prisma";
import { ToolSource } from "@prisma/client";
import { AuditData } from "@/lib/connectors/types";

const connectorService = new ConnectorService();

type AuditResult = {
	source: ToolSource;
	data?: AuditData;
	success: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	error?: any;
};

export const syncIntegrationsJob = inngest.createFunction(
	{
		id: "sync-integrations",
		name: "Sync Tool Integrations",
		retries: 2,
	},
	{ event: "integrations/sync" },
	async ({ event, step }) => {
		const { organizationId, userId, source } = event.data;

		if (source) {
			// Sync specific integration
			const result = await step.run(`sync-${source}`, async () => {
				try {
					const data = await connectorService.syncIntegration(
						organizationId,
						source as ToolSource
					);
					return { source, success: true, data };
				} catch (error) {
					console.error(`Failed to sync ${source}:`, error);
					return {
						source,
						success: false,
						error: (error as Error).message,
					};
				}
			});

			// Log activity
			await step.run("log-sync-activity", async () => {
				await prisma.activity.create({
					data: {
						organizationId,
						userId,
						action: "integration.synced",
						metadata: {
							source,
							success: result.success,
							error: result.success
								? undefined
								: (result as AuditResult).error,
						},
					},
				});
			});

			// Send notification
			await step.run("send-notification", async () => {
				await prisma.notification.create({
					data: {
						userId,
						type: result.success
							? "AUDIT_COMPLETE"
							: "INTEGRATION_ERROR",
						title: result.success
							? `${source} Synced Successfully`
							: `${source} Sync Failed`,
						message: result.success
							? `Your ${source} integration has been synced`
							: `Failed to sync ${source}: ${(result as AuditResult).error}`,
						actionUrl: "/dashboard/integrations",
					},
				});
			});

			return result;
		} else {
			// Sync all integrations
			const integrations = await step.run(
				"get-integrations",
				async () => {
					return prisma.toolIntegration.findMany({
						where: {
							organizationId,
							isActive: true,
						},
					});
				}
			);

			const results: AuditResult[] = [];

			for (const integration of integrations) {
				const result = await step.run(
					`sync-${integration.source}`,
					async () => {
						try {
							const data = await connectorService.syncIntegration(
								organizationId,
								integration.source
							);
							return {
								source: integration.source,
								success: true,
								data,
							};
						} catch (error) {
							console.error(
								`Failed to sync ${integration.source}:`,
								error
							);
							return {
								source: integration.source,
								success: false,
								error: (error as Error).message,
							};
						}
					}
				);
				results.push(result as AuditResult);
			}

			// Log activity
			await step.run("log-sync-all-activity", async () => {
				await prisma.activity.create({
					data: {
						organizationId,
						userId,
						action: "integration.synced_all",
						metadata: {
							totalIntegrations: integrations.length,
							successful: results.filter((r) => r.success).length,
							failed: results.filter((r) => !r.success).length,
						},
					},
				});
			});

			// Send notification
			await step.run("send-all-sync-notification", async () => {
				const successCount = results.filter((r) => r.success).length;
				const failCount = results.filter((r) => !r.success).length;

				await prisma.notification.create({
					data: {
						userId,
						type:
							failCount > 0
								? "INTEGRATION_ERROR"
								: "AUDIT_COMPLETE",
						title:
							failCount > 0
								? "Some Integrations Failed to Sync"
								: "All Integrations Synced",
						message:
							failCount > 0
								? `${successCount} succeeded, ${failCount} failed`
								: `Successfully synced ${successCount} integrations`,
						actionUrl: "/dashboard/integrations",
					},
				});
			});

			return { results, totalCount: integrations.length };
		}
	}
);
