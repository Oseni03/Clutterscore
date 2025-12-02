"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./users";
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

/**
 * Create a new organization
 */
export async function createOrganization(
	userId: string,
	data: {
		name: string;
		slug: string;
		productId?: string;
		trial?: boolean;
	}
) {
	try {
		// Check if slug is already taken
		const existingOrg = await prisma.organization.findFirst({
			where: { slug: data.slug },
		});

		if (existingOrg) {
			return {
				success: false,
				error: "This slug is already taken",
			};
		}

		// Check if this user already has organizations (for trial eligibility)
		const existingOrgsCount = await prisma.member.count({
			where: { userId },
		});

		// Create organization with user as admin
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

		// Set this as the active organization
		try {
			await setActiveOrganization(organization.id);
		} catch (err) {
			console.error("Failed to set active organization:", err);
		}

		// Create subscription
		try {
			const { createFreeSubscription, createSubscription } = await import(
				"./subscription"
			);

			const productId = data.productId || "";
			const isPaidPlan = productId && productId !== "";

			if (existingOrgsCount === 0 && data.trial) {
				// First organization with trial: 14 days
				await createSubscription({
					organizationId: organization.id,
					productId,
					amount: 0,
					currency: "USD",
					recurringInterval: "monthly",
					trialDays: 14,
				});
			} else if (isPaidPlan) {
				// Create pending subscription for paid plans
				// This will be updated by Polar webhook after checkout
				const now = new Date();
				await prisma.subscription.create({
					data: {
						organizationId: organization.id,
						status: "pending",
						amount: 0,
						currency: "USD",
						recurringInterval: "monthly",
						currentPeriodStart: now,
						currentPeriodEnd: now,
						cancelAtPeriodEnd: false,
						startedAt: now,
						customerId: `pending_${organization.id}`,
						productId: productId,
						checkoutId: `pending_${organization.id}`,
						createdAt: now,
					},
				});
			} else {
				// Create free subscription
				await createFreeSubscription(organization.id);
			}
		} catch (err) {
			console.error("Error creating subscription for organization:", err);
			// Don't fail the entire operation if subscription creation fails
		}

		return { data: organization, success: true };
	} catch (error) {
		console.error("Error creating organization:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to create organization",
		};
	}
}

/**
 * Update an organization
 */
export async function updateOrganization(
	organizationId: string,
	data: Partial<{
		name: string;
		slug: string;
		targetScore: number;
	}>
) {
	try {
		const sessionData = await auth.api.getSession({
			headers: await headers(),
		});

		if (!sessionData?.user) {
			return { success: false, error: "Unauthorized" };
		}

		// Verify user has admin role
		const member = await prisma.member.findFirst({
			where: {
				userId: sessionData.user.id,
				organizationId,
				role: "admin",
			},
		});

		if (!member) {
			return {
				success: false,
				error: "You must be an admin to update this organization",
			};
		}

		// If slug is being updated, check if it's taken
		if (data.slug) {
			const existingOrg = await prisma.organization.findFirst({
				where: {
					slug: data.slug,
					id: { not: organizationId },
				},
			});

			if (existingOrg) {
				return {
					success: false,
					error: "This slug is already taken",
				};
			}
		}

		const organization = await prisma.organization.update({
			where: { id: organizationId },
			data,
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
			},
		});

		return { data: organization, success: true };
	} catch (error) {
		console.error("Error updating organization:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to update organization",
		};
	}
}

/**
 * Delete an organization
 */
export async function deleteOrganization(organizationId: string) {
	try {
		const sessionData = await auth.api.getSession({
			headers: await headers(),
		});

		if (!sessionData?.user) {
			return { success: false, error: "Unauthorized" };
		}

		// Verify user has admin role
		const member = await prisma.member.findFirst({
			where: {
				userId: sessionData.user.id,
				organizationId,
				role: "admin",
			},
		});

		if (!member) {
			return {
				success: false,
				error: "You must be an admin to delete this organization",
			};
		}

		await prisma.organization.delete({
			where: { id: organizationId },
		});

		return { success: true };
	} catch (error) {
		console.error("Error deleting organization:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to delete organization",
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
