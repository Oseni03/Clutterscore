import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			// Trigger background job
			const { ids } = await inngest.send({
				name: "audit/run",
				data: {
					organizationId: user.organizationId,
					userId: user.id,
				},
			});

			return NextResponse.json({
				success: true,
				jobId: ids[0],
				message: "Audit started in background",
			});
		} catch (error) {
			console.error("Failed to start audit:", error);
			return NextResponse.json(
				{ error: "Failed to start audit" },
				{ status: 500 }
			);
		}
	});
}
