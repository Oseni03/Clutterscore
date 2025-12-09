import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware";
import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;

	return withAuth(req, async (req, user) => {
		try {
			// Validate playbook exists and belongs to user's org
			const playbook = await prisma.playbook.findUnique({
				where: { id },
				select: {
					id: true,
					organizationId: true,
					status: true,
					title: true,
				},
			});

			if (!playbook) {
				return NextResponse.json(
					{ error: "Playbook not found" },
					{ status: 404 }
				);
			}

			if (playbook.organizationId !== user.organizationId) {
				return NextResponse.json(
					{ error: "Forbidden" },
					{ status: 403 }
				);
			}

			if (
				playbook.status !== "PENDING" &&
				playbook.status !== "APPROVED"
			) {
				return NextResponse.json(
					{
						error: `Cannot execute playbook with status: ${playbook.status}`,
					},
					{ status: 400 }
				);
			}

			// Trigger background job
			const { ids } = await inngest.send({
				name: "playbook/execute",
				data: {
					playbookId: id,
					userId: user.id,
					organizationId: user.organizationId,
				},
			});

			return NextResponse.json({
				success: true,
				jobId: ids[0],
				message: `Executing "${playbook.title}" in background...`,
			});
		} catch (error) {
			logger.error("Failed to start playbook execution:", error as Error);
			return NextResponse.json(
				{ error: "Failed to start execution" },
				{ status: 500 }
			);
		}
	});
}
