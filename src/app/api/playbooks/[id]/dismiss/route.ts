import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	return withAuth(req, async (req, user) => {
		try {
			const playbook = await prisma.playbook.update({
				where: {
					id,
					organizationId: user.organizationId,
				},
				data: {
					status: "DISMISSED",
					dismissedAt: new Date(),
				},
			});

			await prisma.activity.create({
				data: {
					organizationId: user.organizationId,
					userId: user.id,
					action: "playbook.dismissed",
					metadata: {
						playbookId: playbook.id,
						title: playbook.title,
					},
				},
			});

			return NextResponse.json({
				success: true,
				message: "Playbook dismissed",
			});
		} catch (error) {
			console.error("Playbook dismissal error:", error);
			return NextResponse.json(
				{
					error:
						(error as Error).message ||
						"Failed to dismiss playbook",
				},
				{ status: 500 }
			);
		}
	});
}
