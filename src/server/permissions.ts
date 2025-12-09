"use server";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";

export const isAdmin = async () => {
	try {
		const { success, error } = await auth.api.hasPermission({
			headers: await headers(),
			body: {
				permissions: {
					organization: ["update", "delete"],
					invitation: ["create", "cancel"],
				},
			},
		});

		if (error) {
			return {
				success: false,
				error: error || "Failed to check permissions",
			};
		}

		return { success };
	} catch (error) {
		logger.error("ISADMIN_ERROR", error);
		return {
			success: false,
			error: error || "Failed to check permissions",
		};
	}
};
