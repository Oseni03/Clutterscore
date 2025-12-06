import { NextRequest, NextResponse } from "next/server";
import { ToolSource } from "@prisma/client";
import { withAuth } from "@/lib/middleware";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { source } = await req.json();

			// Validate source if provided
			if (source && !Object.values(ToolSource).includes(source)) {
				return NextResponse.json(
					{ error: "Invalid source" },
					{ status: 400 }
				);
			}

			// Trigger background job
			const { ids } = await inngest.send({
				name: "integrations/sync",
				data: {
					organizationId: user.organizationId,
					userId: user.id,
					source: source || null,
				},
			});

			return NextResponse.json({
				success: true,
				jobId: ids[0],
				message: source
					? `Syncing ${source} in background...`
					: "Syncing all integrations in background...",
			});
		} catch (error) {
			console.error("Failed to start sync:", error);
			return NextResponse.json(
				{ error: "Failed to start sync job" },
				{ status: 500 }
			);
		}
	});
}
