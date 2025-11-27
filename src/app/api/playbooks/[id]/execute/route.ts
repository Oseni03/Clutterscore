import { NextRequest, NextResponse } from "next/server";
import { ConnectorService } from "@/server/connector-service";
import { withAuth } from "@/lib/middleware";

const connectorService = new ConnectorService();

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	return withAuth(req, async (req, user) => {
		try {
			await connectorService.executePlaybook(id, user.id);

			return NextResponse.json({
				success: true,
				message: "Playbook executed successfully",
			});
		} catch (error) {
			console.error("Playbook execution error:", { error });
			return NextResponse.json(
				{
					error:
						(error as Error).message ||
						"Failed to execute playbook",
				},
				{ status: 500 }
			);
		}
	});
}
