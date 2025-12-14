"use server";

import { prisma } from "@/lib/prisma";
import { isAdmin } from "./permissions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Organization } from "@prisma/client";
import { logger } from "@/lib/logger";
import { slugifyWithCounter } from "@sindresorhus/slugify";

export async function getOrganizations(userId: string): Promise<{
	organizations?: Organization[];
	success: boolean;
	error?: string;
}> {
	try {
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

		return { success: true, organizations };
	} catch (error) {
		logger.error("GET_ORGANIZATION_ERROR:", error);
		return { success: false, error: (error as Error).message };
	}
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
		logger.error("GET_ORG_BY_SLUG_ERROR", error);
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
		logger.error("UPDATE_ORG_ERROR: ", error);
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
			headers: await headers(),
		});
		return { success: true, data: result };
	} catch (error) {
		logger.error("DELETE_ORG_ERROR", error);
		return { success: false, error };
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
		const slugify = slugifyWithCounter();
		const baseSlug = slugify(data.name);

		if (!baseSlug) {
			return {
				success: false,
				error: "Invalid workspace name - unable to generate workspace slug",
			};
		}

		// Find available slug by checking existing organizations
		const existingSlugs = await prisma.organization.findMany({
			where: {
				slug: {
					startsWith: baseSlug,
				},
			},
			select: {
				slug: true,
			},
		});

		// Generate unique slug with counter if needed
		let slug = baseSlug;
		let counter = 1;

		const existingSlugSet = new Set(existingSlugs.map((org) => org.slug));

		while (existingSlugSet.has(slug)) {
			slug = slugify(data.name);
			counter++;

			// Safety limit
			if (counter > 100) {
				return {
					success: false,
					error: "Unable to generate unique workspace URL",
				};
			}
		}

		// Create organization with generated slug
		const organization = await prisma.organization.create({
			data: {
				name: data.name,
				slug: slug,
				targetScore: data.targetScore || 75,
				subscriptionTier: data.subscriptionTier || "FREE",
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
		logger.error("CREATE_ORG_ERROR:", error);
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
			headers: await headers(),
		});
		return { data: result, success: true };
	} catch (error) {
		logger.error("SET_ACTIVE_ORG_ERROR: ", error);
		return { success: false, error };
	}
}
