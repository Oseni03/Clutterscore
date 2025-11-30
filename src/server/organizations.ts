"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./users";
import { isAdmin } from "./permissions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getOrganizations() {
	const { currentUser } = await getCurrentUser();

	const members = await prisma.member.findMany({
		where: {
			userId: currentUser.id,
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
	data: { name: string; slug?: string }
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

export async function createOrganization(
	userId: string,
	data: { name: string; slug: string }
) {
	try {
		// Direct database creation bypassing auth API
		const organization = await prisma.organization.create({
			data: {
				name: data.name,
				slug: data.slug,
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
		console.error("Error creating organization: ", error);
		return { success: false, error };
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
