import { NextRequest, NextResponse } from "next/server";
import { ConnectorService } from "@/server/connector-service";
import { ToolSource } from "@prisma/client";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";

const connectorService = new ConnectorService();

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

			const isConnected =
				await connectorService.testIntegrationConnection(
					user.organizationId,
					source
				);

			return NextResponse.json({ success: true, isConnected });
		} catch (error) {
			logger.error("Connection test error:", error as Error);
			return NextResponse.json(
				{ error: (error as Error).message || "Connection test failed" },
				{ status: 500 }
			);
		}
	});
}
