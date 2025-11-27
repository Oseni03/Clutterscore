import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const auditResult = await prisma.auditResult.findFirst({
				where: {
					organizationId: user.organizationId,
				},
				orderBy: {
					auditedAt: "desc",
				},
				include: {
					playbooks: {
						include: {
							items: true,
						},
						orderBy: {
							createdAt: "desc",
						},
					},
					_count: {
						select: {
							files: true,
						},
					},
				},
			});

			if (!auditResult) {
				return NextResponse.json(
					{ error: "No audit results found" },
					{ status: 404 }
				);
			}

			return NextResponse.json({ success: true, auditResult });
		} catch (error) {
			console.error("Failed to fetch audit:", error);
			return NextResponse.json(
				{ error: (error as Error).message || "Failed to fetch audit" },
				{ status: 500 }
			);
		}
	});
}
