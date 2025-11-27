import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ToolSource } from "@prisma/client";
import { ConnectorFactory } from "@/lib/connectors/factory";
import { withAuth } from "@/lib/middleware";

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

			try {
				const connector = ConnectorFactory.create(source, {
					accessToken: integration.accessToken,
					refreshToken: integration.refreshToken || undefined,
					organizationId: user.organizationId,
				});

				const newAccessToken = await connector.refreshToken();

				// Update token in database
				await prisma.toolIntegration.update({
					where: { id: integration.id },
					data: {
						accessToken: newAccessToken,
						expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
						lastError: null,
						lastErrorAt: null,
					},
				});

				return NextResponse.json({
					success: true,
					message: "Token refreshed successfully",
				});
			} catch (error) {
				// Update error in database
				await prisma.toolIntegration.update({
					where: { id: integration.id },
					data: {
						lastError: (error as Error).message,
						lastErrorAt: new Date(),
					},
				});

				throw error;
			}
		} catch (error) {
			console.error("Token refresh error:", error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}
