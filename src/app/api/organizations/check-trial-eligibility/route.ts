import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			// Check if user has any existing organizations
			const existingOrgsCount = await prisma.member.count({
				where: { userId: user.id },
			});

			// User is eligible for trial if they have no existing organizations
			const eligible = existingOrgsCount === 0;

			return NextResponse.json({ eligible });
		} catch (error) {
			console.error("Error checking trial eligibility:", error);
			return NextResponse.json(
				{ error: "Failed to check trial eligibility" },
				{ status: 500 }
			);
		}
	});
}
