import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ invitationId: string }> }
) {
	const { invitationId } = await params;

	try {
		await auth.api.acceptInvitation({
			body: {
				invitationId,
			},
			headers: await headers(),
		});

		return NextResponse.redirect(new URL("/dashboard", request.url));
	} catch (error) {
		logger.error("Error accepting organization invitation", {
			...(error as Error),
		});
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}
}
