import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ToolSource } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";
import { unregisterIntegrationWebhook } from "@/lib/integrations/webhooks";

export async function POST(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { source } = await req.json();

			if (!source || !Object.values(ToolSource).includes(source)) {
				return NextResponse.json(
					{ error: "Invalid source" },
					{ status: 400 }
				);
			}

			const integration = await prisma.toolIntegration.findUnique({
				where: {
					organizationId_source: {
						organizationId: user.organizationId,
						source,
					},
				},
			});

			if (!integration) {
				return NextResponse.json(
					{ error: "Integration not found" },
					{ status: 404 }
				);
			}

			await unregisterIntegrationWebhook(integration);

			const metadata = {
				...((integration.metadata ?? {}) as Record<string, unknown>),
			};
			delete metadata.webhook;

			await prisma.toolIntegration.update({
				where: { id: integration.id },
				data: {
					metadata: metadata as Prisma.InputJsonValue,
				},
			});

			await prisma.activity.create({
				data: {
					organizationId: user.organizationId,
					userId: user.id,
					action: "integration.webhook_disabled",
					metadata: { source },
				},
			});

			return NextResponse.json({
				success: true,
				message: "Webhook disabled successfully",
			});
		} catch (error) {
			logger.error("Webhook unregister error:", error as Error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}
