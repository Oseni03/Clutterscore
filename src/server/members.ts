"use server";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";

export const addMember = async (
	organizationId: string,
	userId: string,
	role: "member" | "admin" | ("member" | "admin")[]
) => {
	try {
		const data = await auth.api.addMember({
			body: {
				userId,
				organizationId,
				role,
			},
		});
		return { success: true, data };
	} catch (error) {
		logger.error("ERROR_ADDING_MEMBER", error);
		return { success: false, error };
	}
};

export const removeMember = async (
	organizationId: string,
	memberId: string
) => {
	try {
		const data = await auth.api.removeMember({
			body: {
				organizationId,
				memberIdOrEmail: memberId,
			},
			headers: await headers(),
		});

		return {
			success: true,
			data,
		};
	} catch (error) {
		logger.error("ERROR_REMOVING_MEMBER", error);
		return {
			success: false,
			error,
		};
	}
};

export async function updateMemberRole(
	memberId: string,
	organizationId: string,
	role: "admin" | "member" | ("admin" | "member")[]
) {
	try {
		const result = await auth.api.updateMemberRole({
			body: {
				role, // required
				memberId, // required
				organizationId,
			},
			headers: await headers(),
		});
		return { data: result, success: true };
	} catch (error) {
		logger.error("ERROR_UPDATING_ROLE: ", error);
		return { success: false, error };
	}
}
