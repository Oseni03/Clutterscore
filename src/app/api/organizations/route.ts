import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
	createOrganization,
	setActiveOrganization,
} from "@/server/organizations";
import { createFreeSubscription } from "@/server/subscription";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createOrgSchema = z.object({
	name: z.string().min(2).max(50),
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

		const { name, userId } = validation.data;

		// Verify the userId matches the session user
		if (userId !== session.user.id) {
			return NextResponse.json(
				{ error: "Forbidden - User ID mismatch" },
				{ status: 403 }
			);
		}

		// Create organization using server action (handles slug generation)
		const result = await createOrganization(userId, { name });

		if (!result.success || !result.data) {
			return NextResponse.json(
				{ error: result.error || "Failed to create workspace" },
				{ status: 400 }
			);
		}

		// Create free subscription for the organization
		await createFreeSubscription(result.data.id);

		// Set as active organization
		const setActiveResult = await setActiveOrganization(result.data.id);

		if (!setActiveResult.success) {
			console.error(
				"Failed to set active organization:",
				setActiveResult.error
			);
		}

		return NextResponse.json(
			{
				success: true,
				organization: result.data,
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
