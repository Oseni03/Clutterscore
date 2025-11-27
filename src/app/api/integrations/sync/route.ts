import { NextRequest, NextResponse } from "next/server";
import { ConnectorService } from "@/server/connector-service";
import { ToolSource } from "@prisma/client";
import { withAuth } from "@/lib/middleware";

const connectorService = new ConnectorService();

export async function POST(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { source } = await req.json();

			if (source && !Object.values(ToolSource).includes(source)) {
				return NextResponse.json(
					{ error: "Invalid source" },
					{ status: 400 }
				);
			}

			let results;

			if (source) {
				// Sync specific integration
				const data = await connectorService.syncIntegration(
					user.organizationId,
					source
				);
				results = { [source]: data };
			} else {
				// Sync all integrations
				const data = await connectorService.syncAllIntegrations(
					user.organizationId
				);
				results = Object.fromEntries(data);
			}

			return NextResponse.json({ success: true, results });
		} catch (error) {
			console.error("Sync error:", error);
			return NextResponse.json(
				{ error: (error as Error).message || "Failed to sync" },
				{ status: 500 }
			);
		}
	});
}
