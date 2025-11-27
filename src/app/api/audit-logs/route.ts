import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { AuditLogActionType, AuditLogStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { searchParams } = req.nextUrl;
			const page = parseInt(searchParams.get("page") || "1");
			const limit = parseInt(searchParams.get("limit") || "50");
			const actionType = searchParams.get("actionType");
			const status = searchParams.get("status");

			const skip = (page - 1) * limit;

			const [logs, total] = await Promise.all([
				prisma.auditLog.findMany({
					where: {
						organizationId: user.organizationId,
						...(actionType && {
							actionType: actionType as AuditLogActionType,
						}),
						...(status && { status: status as AuditLogStatus }),
					},
					include: {
						user: {
							select: {
								name: true,
								email: true,
							},
						},
						playbook: {
							select: {
								title: true,
								source: true,
							},
						},
					},
					orderBy: {
						timestamp: "desc",
					},
					skip,
					take: limit,
				}),
				prisma.auditLog.count({
					where: {
						organizationId: user.organizationId,
						...(actionType && {
							actionType: actionType as AuditLogActionType,
						}),
						...(status && { status: status as AuditLogStatus }),
					},
				}),
			]);

			return NextResponse.json({
				success: true,
				logs,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		} catch (error) {
			console.error("Failed to fetch audit logs:", error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}
