import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFreeSubscription } from "@/server/subscription";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createOrgSchema = z.object({
	name: z.string().min(2).max(50),
	slug: z
		.string()
		.min(2)
		.max(30)
		.regex(/^[a-z0-9-]+$/),
	userId: z.string(),
});

export async function POST(req: NextRequest) {
	try {
		// Verify authentication
		const session = await auth.api.getSession({
			headers: req.headers,
		});

		if (!session) {
			return NextResponse.json(
				{ error: "Unauthorized - Please login" },
				{ status: 401 }
			);
		}

		const body = await req.json();
		const validation = createOrgSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{ error: "Invalid input", details: validation.error.message },
				{ status: 400 }
			);
		}

		const { name, slug, userId } = validation.data;

		// Verify the userId matches the session user
		if (userId !== session.user.id) {
			return NextResponse.json(
				{ error: "Forbidden - User ID mismatch" },
				{ status: 403 }
			);
		}

		// Check if user already has an organization
		const existingMember = await prisma.member.findFirst({
			where: { userId },
		});

		if (existingMember) {
			return NextResponse.json(
				{ error: "User already has a workspace" },
				{ status: 400 }
			);
		}

		// Check if slug is already taken
		const existingOrg = await prisma.organization.findUnique({
			where: { slug },
		});

		if (existingOrg) {
			return NextResponse.json(
				{
					error: "Workspace URL is already taken. Please choose another.",
				},
				{ status: 400 }
			);
		}

		// Create organization with member
		const organization = await prisma.organization.create({
			data: {
				name,
				slug,
				createdAt: new Date(),
				members: {
					create: {
						userId,
						role: "admin",
					},
				},
			},
			include: {
				members: {
					include: {
						user: true,
					},
				},
			},
		});

		// Create free subscription for the organization
		await createFreeSubscription(organization.id);

		// Set as active organization
		await auth.api.setActiveOrganization({
			body: {
				organizationId: organization.id,
			},
			headers: req.headers,
		});

		return NextResponse.json(
			{
				success: true,
				organization,
			},
			{ status: 201 }
		);
	} catch (error) {
		logger.error("Error creating organization:", error as Error);

		if (error instanceof Error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(
			{ error: "Failed to create workspace" },
			{ status: 500 }
		);
	}
}
