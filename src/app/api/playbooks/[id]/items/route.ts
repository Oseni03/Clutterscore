import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	return withAuth(req, async (req, user) => {
		try {
			const { selectedItemIds } = await req.json();

			if (!Array.isArray(selectedItemIds)) {
				return NextResponse.json(
					{ error: "Invalid request body" },
					{ status: 400 }
				);
			}

			// Verify playbook belongs to organization
			const playbook = await prisma.playbook.findFirst({
				where: {
					id,
					organizationId: user.organizationId,
				},
			});

			if (!playbook) {
				return NextResponse.json(
					{ error: "Playbook not found" },
					{ status: 404 }
				);
			}

			// Update all items - set isSelected based on whether they're in the array
			await prisma.playbookItem.updateMany({
				where: {
					playbookId: id,
				},
				data: {
					isSelected: false,
				},
			});

			// Set selected items
			await prisma.playbookItem.updateMany({
				where: {
					playbookId: id,
					id: {
						in: selectedItemIds,
					},
				},
				data: {
					isSelected: true,
				},
			});

			return NextResponse.json({
				success: true,
				message: "Items updated successfully",
			});
		} catch (error) {
			logger.error("Failed to update items:", error as Error);
			return NextResponse.json(
				{ error: (error as Error).message || "Failed to update items" },
				{ status: 500 }
			);
		}
	});
}
