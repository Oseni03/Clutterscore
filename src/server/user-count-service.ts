/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { ToolSource } from "@prisma/client";
import { ConnectorFactory } from "@/lib/connectors/factory";
import { logger } from "@/lib/logger";

export class UserCountService {
	static async syncUserCount(organizationId: string): Promise<{
		userCount: number;
		source: string;
	}> {
		const integrations = await prisma.toolIntegration.findMany({
			where: {
				organizationId,
				isActive: true,
			},
			orderBy: {
				connectedAt: "asc",
			},
		});

		if (integrations.length === 0) {
			throw new Error("No active integrations found");
		}

		// Define priority order (only sources that support user count)
		const priorityOrder: ToolSource[] = ["GOOGLE", "DROPBOX", "SLACK"];

		// Try each source in priority order
		for (const source of priorityOrder) {
			const integration = integrations.find((i) => i.source === source);

			if (!integration) continue;

			try {
				const connector = ConnectorFactory.create(source, {
					accessToken: integration.accessToken,
					refreshToken: integration.refreshToken || undefined,
					organizationId,
					metadata: integration.metadata as Record<string, any>,
				});

				const userCount = await connector.fetchUserCount();

				// Skip if connector returned 0 (not supported)
				if (userCount === 0) {
					logger.info(
						`${source} does not support user count detection, skipping`
					);
					continue;
				}

				// Update organization with detected user count
				await prisma.organization.update({
					where: { id: organizationId },
					data: {
						detectedUserCount: userCount,
						userCountSource: source,
						userCountLastSync: new Date(),
						userCountVerified: false,
					},
				});

				logger.info(
					`Synced ${userCount} users from ${source} for org ${organizationId}`
				);

				return { userCount, source };
			} catch (error: any) {
				logger.warn(
					`Failed to fetch user count from ${source}: ${error.message}`
				);
				// Continue to next source
			}
		}

		// If no supported source found
		const unsupportedSources = integrations
			.map((i) => i.source)
			.filter((s) => !priorityOrder.includes(s));

		if (unsupportedSources.length > 0) {
			throw new Error(
				`No supported integrations for user count detection. Connected integrations (${unsupportedSources.join(", ")}) do not provide user count. Please connect Google Workspace, Dropbox, or Slack.`
			);
		}

		throw new Error(
			"Could not fetch user count from any available integration (Google, Dropbox, or Slack)"
		);
	}

	/**
	 * Get cached user count or sync if needed
	 */
	static async getUserCount(
		organizationId: string,
		forceSync = false
	): Promise<{
		userCount: number;
		source: string | null;
		lastSync: Date | null;
		verified: boolean;
	}> {
		const org = await prisma.organization.findUnique({
			where: { id: organizationId },
			select: {
				detectedUserCount: true,
				userCountSource: true,
				userCountLastSync: true,
				userCountVerified: true,
			},
		});

		if (!org) {
			throw new Error("Organization not found");
		}

		// If forced sync or no cached count, sync now
		if (forceSync || !org.detectedUserCount) {
			const result = await this.syncUserCount(organizationId);
			return {
				userCount: result.userCount,
				source: result.source,
				lastSync: new Date(),
				verified: false,
			};
		}

		// Check if cache is stale (>7 days)
		const isStale =
			!org.userCountLastSync ||
			Date.now() - org.userCountLastSync.getTime() >
				7 * 24 * 60 * 60 * 1000;

		if (isStale) {
			try {
				const result = await this.syncUserCount(organizationId);
				return {
					userCount: result.userCount,
					source: result.source,
					lastSync: new Date(),
					verified: false,
				};
			} catch {
				logger.warn(
					"Failed to sync stale user count, using cached value"
				);
			}
		}

		return {
			userCount: org.detectedUserCount,
			source: org.userCountSource,
			lastSync: org.userCountLastSync,
			verified: org.userCountVerified,
		};
	}

	/**
	 * Verify user count (manual confirmation by user)
	 */
	static async verifyUserCount(
		organizationId: string,
		userCount: number
	): Promise<void> {
		await prisma.organization.update({
			where: { id: organizationId },
			data: {
				detectedUserCount: userCount,
				userCountVerified: true,
				userCountSource: "MANUAL",
				userCountLastSync: new Date(),
			},
		});

		logger.info(
			`User manually verified ${userCount} users for org ${organizationId}`
		);
	}
}
