// app/api/organizations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organizations
 * Fetch all organizations the authenticated user is a member of
 */
export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			// Fetch organizations where user is a member
			const organizations = await prisma.organization.findMany({
				where: {
					members: {
						some: {
							userId: user.id,
						},
					},
				},
				include: {
					subscription: true,
					members: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
						},
					},
					_count: {
						select: {
							members: true,
							integrations: true,
							playbooks: true,
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			return NextResponse.json({ organizations });
		} catch (error) {
			console.error("Error fetching organizations:", error);
			return NextResponse.json(
				{ error: "Failed to fetch organizations" },
				{ status: 500 }
			);
		}
	});
}

/**
 * POST /api/organizations
 * Create a new organization (handled via server action, this is backup)
 */
export async function POST(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const body = await req.json();
			const { name, slug } = body;

			if (!name || !slug) {
				return NextResponse.json(
					{ error: "Name and slug are required" },
					{ status: 400 }
				);
			}

			// Check if slug is already taken
			const existingOrg = await prisma.organization.findFirst({
				where: { slug },
			});

			if (existingOrg) {
				return NextResponse.json(
					{ error: "This slug is already taken" },
					{ status: 409 }
				);
			}

			// Create organization with user as admin
			const organization = await prisma.organization.create({
				data: {
					name,
					slug,
					createdAt: new Date(),
					members: {
						create: {
							userId: user.id,
							role: "admin",
						},
					},
				},
				include: {
					members: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
						},
					},
				},
			});

			return NextResponse.json({ organization }, { status: 201 });
		} catch (error) {
			console.error("Error creating organization:", error);
			return NextResponse.json(
				{ error: "Failed to create organization" },
				{ status: 500 }
			);
		}
	});
}
