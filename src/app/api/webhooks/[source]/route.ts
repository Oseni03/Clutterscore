import { NextRequest, NextResponse } from "next/server";
import { WebhookRegistry } from "@/lib/webhooks/register";
import { ToolSource } from "@prisma/client";
import { logger } from "@/lib/logger";
import { inngest } from "@/inngest/client";

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

		// Read raw body once and clone a Request for handler verification
		const rawBody = await req.text();
		const verifyReq = new Request(req.url, {
			method: req.method,
			headers: req.headers,
			body: rawBody,
		});

		// Verify webhook signature using cloned request
		const isValid = await handler.verify(verifyReq);

		if (!isValid) {
			return NextResponse.json(
				{ error: "Invalid signature" },
				{ status: 401 }
			);
		}

		const body = rawBody ? JSON.parse(rawBody) : {};

		// Handle Slack URL verification (respond with plain text challenge)
		if (source === "SLACK" && body.type === "url_verification") {
			return new NextResponse(body.challenge, {
				headers: { "Content-Type": "text/plain" },
			});
		}

		// Handle Microsoft subscription validation
		if (source === "MICROSOFT" && body.validationToken) {
			return new NextResponse(body.validationToken, {
				headers: { "Content-Type": "text/plain" },
			});
		}

		await inngest.send({
			name: "handler/webhook",
			data: {
				source,
				eventType:
					body.type ||
					body.event?.type ||
					body.changeType ||
					"unknown",
				data: body.event || body,
			},
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		logger.error("Webhook error:", error as Error);
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
