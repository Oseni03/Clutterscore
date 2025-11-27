import { NextRequest, NextResponse } from "next/server";
import { WebhookRegistry } from "@/lib/webhooks/register";
import { ToolSource } from "@prisma/client";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ source: string }> }
) {
	try {
		const { source: defaultSource } = await params;
		const source = defaultSource.toUpperCase() as ToolSource;

		if (!Object.values(ToolSource).includes(source)) {
			return NextResponse.json(
				{ error: "Invalid source" },
				{ status: 400 }
			);
		}

		const handler = WebhookRegistry.getHandler(source);

		if (!handler) {
			return NextResponse.json(
				{ error: "No handler for this source" },
				{ status: 404 }
			);
		}

		// Verify webhook signature
		const isValid = await handler.verify(req);

		if (!isValid) {
			return NextResponse.json(
				{ error: "Invalid signature" },
				{ status: 401 }
			);
		}

		const body = await req.json();

		// Handle Slack URL verification
		if (source === "SLACK" && body.type === "url_verification") {
			return NextResponse.json({ challenge: body.challenge });
		}

		// Handle Microsoft subscription validation
		if (source === "MICROSOFT" && body.validationToken) {
			return new NextResponse(body.validationToken, {
				headers: { "Content-Type": "text/plain" },
			});
		}

		// Process webhook event
		await handler.handle({
			source,
			eventType:
				body.type || body.event?.type || body.changeType || "unknown",
			data: body.event || body,
			timestamp: new Date(),
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Webhook error:", error);
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 500 }
		);
	}
}

// Handle GET requests for Dropbox verification
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ source: string }> }
) {
	const { source: defaultSource } = await params;
	const source = defaultSource.toUpperCase();

	if (source === "DROPBOX") {
		const challenge = req.nextUrl.searchParams.get("challenge");

		if (challenge) {
			return new NextResponse(challenge, {
				headers: {
					"Content-Type": "text/plain",
					"X-Content-Type-Options": "nosniff",
				},
			});
		}
	}

	return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
