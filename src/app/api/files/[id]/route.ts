import { withAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	return withAuth(req, async (req, user) => {
		try {
			// Find file and verify ownership
			const file = await prisma.file.findFirst({
				where: {
					id,
					auditResult: {
						organizationId: user.organizationId,
					},
				},
			});

			if (!file) {
				return NextResponse.json(
					{ error: "File not found" },
					{ status: 404 }
				);
			}

			// Mark as deleted (soft delete)
			await prisma.file.update({
				where: { id },
				data: {
					status: "DELETED",
				},
			});

			// Log activity
			await prisma.activity.create({
				data: {
					organizationId: user.organizationId,
					userId: user.id,
					action: "file.deleted",
					metadata: {
						fileId: file.id,
						fileName: file.name,
						source: file.source,
						size: file.sizeMb,
					},
				},
			});

			// Create audit log
			await prisma.auditLog.create({
				data: {
					organizationId: user.organizationId,
					userId: user.id,
					actionType: "DELETE_FILE",
					target: file.name,
					targetType: "File",
					executor: `User ${user.email}`,
					status: "SUCCESS",
					details: {
						source: file.source,
						size: file.sizeMb,
						path: file.path,
					},
				},
			});

			return NextResponse.json({
				success: true,
				message: "File deleted successfully",
			});
		} catch (error) {
			console.error("Failed to delete file:", error);
			return NextResponse.json(
				{ error: (error as Error).message || "Failed to delete file" },
				{ status: 500 }
			);
		}
	});
}
