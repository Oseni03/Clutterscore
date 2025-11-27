import { NextRequest, NextResponse } from "next/server";
import { ConnectorService } from "@/server/connector-service";
import { withAuth } from "@/lib/middleware";

const connectorService = new ConnectorService();

export async function POST(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			// Run complete audit
			const auditResultId = await connectorService.runAudit(
				user.organizationId
			);

			return NextResponse.json({
				success: true,
				auditResultId,
				message: "Audit completed successfully",
			});
		} catch (error) {
			console.error("Audit error:", error);
			return NextResponse.json(
				{ error: (error as Error).message || "Audit failed" },
				{ status: 500 }
			);
		}
	});
}
