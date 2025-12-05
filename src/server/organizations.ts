"use server";

import { prisma } from "@/lib/prisma";
import { isAdmin } from "./permissions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Organization } from "@prisma/client";

export async function getOrganizations(
	userId: string
): Promise<Organization[]> {
	const members = await prisma.member.findMany({
		where: {
			userId,
		},
	});

	const organizations = await prisma.organization.findMany({
		where: {
			members: {
				some: {
					id: {
						in: members.map((member) => member.id),
					},
				},
			},
		},
	});

	return organizations;
}

export async function getActiveOrganization(userId: string) {
	const memberUser = await prisma.member.findFirst({
		where: {
			userId,
		},
	});

	if (!memberUser) {
		return null;
	}

	const activeOrganization = await prisma.organization.findFirst({
		where: { id: memberUser.organizationId },
		include: {
			members: {
				include: {
					user: true,
				},
			},
			invitations: true,
			subscription: true,
		},
	});

	return { ...activeOrganization, role: memberUser.role };
}

export async function getOrganizationBySlug(slug: string) {
	try {
		const organizationBySlug = await prisma.organization.findUnique({
			where: { slug },
			include: {
				members: {
					include: {
						user: true,
					},
				},
				invitations: true,
			},
		});

		return organizationBySlug;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export async function getOrganizationById(orgId: string) {
	try {
		const organization = await prisma.organization.findUnique({
			where: { id: orgId },
			include: {
				members: {
					include: {
						user: true,
					},
				},
				invitations: true,
				subscription: true,
			},
		});

		return { data: organization, success: true };
	} catch (error) {
		console.error(error);
		return { success: false, error };
	}
}

export async function updateOrganization(
	organizationId: string,
	data: {
		name: string;
		slug?: string;
		targetScore?: number;
		subscriptionTier?: string;
	}
) {
	try {
		const result = await auth.api.updateOrganization({
			body: {
				data,
				organizationId,
			},
			// This endpoint requires session cookies.
			headers: await headers(),
		});
		return { data: result, success: true };
	} catch (error) {
		console.error("Error updating organization: ", error);
		return {
			success: false,
			error: "Failed to upgrade organization",
		};
	}
}

export async function deleteOrganization(organizationId: string) {
	try {
		const { success } = await isAdmin();

		if (!success) {
			throw new Error("You are not authorized to remove members.");
		}

		const result = await auth.api.deleteOrganization({
			body: {
				organizationId,
			},
			// This endpoint requires session cookies.
			headers: await headers(),
		});
		return { success: true, data: result };
	} catch (error) {
		console.error(error);
		return { success: false, error };
	}
}

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "") // Remove special characters
		.replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
		.replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

async function findAvailableSlug(baseSlug: string): Promise<string> {
	let slug = baseSlug;
	let counter = 1;

	while (true) {
		try {
			// Check slug availability using BetterAuth API
			const result = await auth.api.checkOrganizationSlug({
				body: {
					slug: slug,
				},
			});

			// If slug is available, return it
			if (result && !result.status) {
				return slug;
			}

			// If taken, append counter and try again
			slug = `${baseSlug}-${counter}`;
			counter++;
		} catch (error) {
			console.error("Error checking slug availability:", error);
			// Fallback to appending counter
			slug = `${baseSlug}-${counter}`;
			counter++;

			// Safety limit to prevent infinite loops
			if (counter > 100) {
				throw new Error("Unable to generate unique slug");
			}
		}
	}
}

export async function createOrganization(
	userId: string,
	data: {
		name: string;
		targetScore?: number;
		subscriptionTier?: string;
	}
) {
	try {
		// Generate base slug from name
		const baseSlug = generateSlug(data.name);

		if (!baseSlug) {
			return {
				success: false,
				error: "Invalid organization name - unable to workspace slug",
			};
		}

		// Find available slug
		const slug = await findAvailableSlug(baseSlug);

		// Create organization with generated slug
		const organization = await prisma.organization.create({
			data: {
				name: data.name,
				slug: slug,
				targetScore: data.targetScore || 75,
				subscriptionTier: data.subscriptionTier || "free",
				createdAt: new Date(),
				members: {
					create: {
						userId: userId,
						role: "admin",
					},
				},
			},
			include: {
				members: true,
			},
		});

		return { data: organization, success: true };
	} catch (error) {
		console.error("Error creating organization:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to create workspace",
		};
	}
}

export async function setActiveOrganization(organizationId: string) {
	try {
		const result = await auth.api.setActiveOrganization({
			body: {
				organizationId,
			},
			// This endpoint requires session cookies.
			headers: await headers(),
		});
		console.log("Set active organization result:", result);
		return { data: result, success: true };
	} catch (error) {
		console.error("Error creating organization: ", error);
		return { success: false, error };
	}
}
