"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isAdmin } from "./permissions";
import { logger } from "@/lib/logger";

export const createInvitation = async (
	organizationId: string,
	email: string,
	role: "member" | "admin" | ("member" | "admin")[]
) => {
	try {
		const data = await auth.api.createInvitation({
			body: {
				email,
				role,
				organizationId,
				resend: true,
			},
		});
		return { success: true, data };
	} catch (error) {
		logger.error("Error creating invitaton", error);
		return { success: false, error };
	}
};

export const cancelInvitation = async (invitationId: string) => {
	try {
		const { success } = await isAdmin();

		if (!success) {
			return {
				success,
				error: "Unauthorized",
			};
		}

		const data = await auth.api.cancelInvitation({
			body: {
				invitationId,
			},
			headers: await headers(),
		});

		return {
			success: true,
			data,
		};
	} catch (error) {
		logger.error("Error canceling invitation", error);
		return {
			success: false,
			error,
		};
	}
};

export const acceptInvitation = async (invitationId: string) => {
	try {
		const data = await auth.api.rejectInvitation({
			body: {
				invitationId,
			},
			headers: await headers(),
		});

		return {
			success: true,
			data,
		};
	} catch (error) {
		logger.error("Error accepting invitation", error);
		return {
			success: false,
			error,
		};
	}
};

export const rejectInvitation = async (invitationId: string) => {
	try {
		const data = await auth.api.rejectInvitation({
			body: {
				invitationId,
			},
		});

		return {
			success: true,
			data,
		};
	} catch (error) {
		logger.error("Error rejecting invitation", error);
		return {
			success: false,
			error,
		};
	}
};
