import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	return withAuth(req, async (req, user) => {
		try {
			const playbook = await prisma.playbook.findFirst({
				where: {
					id,
					organizationId: user.organizationId,
				},
				include: {
					items: {
						orderBy: {
							itemName: "asc",
						},
					},
				},
			});

			if (!playbook) {
				return NextResponse.json(
					{ error: "Playbook not found" },
					{ status: 404 }
				);
			}

			return NextResponse.json({
				success: true,
				playbook,
			});
		} catch (error) {
			console.error("Failed to fetch playbook:", error);
			return NextResponse.json(
				{
					error:
						(error as Error).message || "Failed to fetch playbook",
				},
				{ status: 500 }
			);
		}
	});
}
