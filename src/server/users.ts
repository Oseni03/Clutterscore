"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "better-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const getCurrentUser = async () => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/login");
	}

	const currentUser = await prisma.user.findFirst({
		where: { id: session.user.id },
	});

	if (!currentUser) {
		redirect("/login");
	}

	return {
		...session,
		currentUser,
	};
};

export const signIn = async (email: string, password: string) => {
	try {
		await auth.api.signInEmail({
			body: {
				email,
				password,
			},
		});

		return {
			success: true,
			message: "Signed in successfully.",
		};
	} catch (error) {
		const e = error as Error;

		return {
			success: false,
			message: e.message || "An unknown error occurred.",
		};
	}
};

export const signUp = async ({
	email,
	password,
	username,
}: {
	email: string;
	password: string;
	username: string;
}) => {
	try {
		await auth.api.signUpEmail({
			body: {
				email,
				password,
				name: username,
			},
		});

		return {
			success: true,
			message: "Signed up successfully.",
		};
	} catch (error) {
		const e = error as Error;

		return {
			success: false,
			message: e.message || "An unknown error occurred.",
		};
	}
};

export const getUsers = async (organizationId: string) => {
	try {
		const members = await prisma.member.findMany({
			where: { organizationId },
		});

		const users = await prisma.user.findMany({
			where: {
				id: { notIn: members.map((member) => member.userId) },
			},
		});

		return users;
	} catch (error) {
		logger.error("GET_USERS_ERROR", error);
		return [];
	}
};

export const getUser = async (userId: string) => {
	try {
		const user = await prisma.user.findFirst({
			where: { id: userId },
		});

		return { success: true, data: user };
	} catch (error) {
		logger.error("GET_USER_ERROR", error);
		return { success: false, error };
	}
};
