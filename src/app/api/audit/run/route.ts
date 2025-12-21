import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware";
import { inngest } from "@/inngest/client";
import { logger } from "@/lib/logger";
import { canRunFreeAudit } from "@/lib/audit-throttle";

export async function POST(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			// Check if audit is allowed
			const throttleCheck = await canRunFreeAudit(user.organizationId);

			if (!throttleCheck.allowed) {
				return NextResponse.json(
					{
						error: throttleCheck.reason,
						resetDate: throttleCheck.resetDate,
						upgrade: {
							message: "Upgrade to Pro for unlimited audits",
							tiers: ["pro-tier-1", "pro-tier-2", "pro-tier-3"],
						},
					},
					{ status: 429 } // Too Many Requests
				);
			}

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
			logger.error("Failed to start audit:", error as Error);
			return NextResponse.json(
				{ error: "Failed to start audit" },
				{ status: 500 }
			);
		}
	});
}
