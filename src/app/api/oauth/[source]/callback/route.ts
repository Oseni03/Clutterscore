import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig, OAuthConfig } from "@/lib/oauth/config";
import { OAuthStateManager } from "@/lib/oauth/state-manager";
import { prisma } from "@/lib/prisma";
import { ToolSource } from "@prisma/client";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ source: string }> }
) {
	const { source: defaultSource } = await params;
	try {
		const searchParams = req.nextUrl.searchParams;
		const code = searchParams.get("code");
		const state = searchParams.get("state");
		const error = searchParams.get("error");

		// Handle OAuth errors
		if (error) {
			return NextResponse.redirect(
				new URL(
					`/dashboard/integrations?error=${encodeURIComponent(error)}`,
					req.url
				)
			);
		}

		if (!code || !state) {
			return NextResponse.redirect(
				new URL(
					`/dashboard/integrations?error=Missing code or state`,
					req.url
				)
			);
		}

		// Verify state
		const stateData = OAuthStateManager.verifyState(state);
		if (!stateData) {
			return NextResponse.redirect(
				new URL(
					`/dashboard/integrations?error=Invalid or expired state`,
					req.url
				)
			);
		}

		const source = defaultSource.toUpperCase() as ToolSource;

		if (source !== stateData.source) {
			return NextResponse.redirect(
				new URL(
					`/dashboard/integrations?error=Source mismatch`,
					req.url
				)
			);
		}

		const config = getOAuthConfig(source);

		// Exchange code for tokens
		const tokenResponse = await exchangeCodeForTokens(source, code, config);

		// Store integration
		await prisma.toolIntegration.upsert({
			where: {
				organizationId_source: {
					organizationId: stateData.organizationId,
					source,
				},
			},
			create: {
				organizationId: stateData.organizationId,
				source,
				accessToken: tokenResponse.access_token,
				refreshToken: tokenResponse.refresh_token || null,
				expiresAt: tokenResponse.expires_in
					? new Date(Date.now() + tokenResponse.expires_in * 1000)
					: null,
				scopes: config.scopes,
				metadata: tokenResponse.metadata || {},
			},
			update: {
				accessToken: tokenResponse.access_token,
				refreshToken: tokenResponse.refresh_token || null,
				expiresAt: tokenResponse.expires_in
					? new Date(Date.now() + tokenResponse.expires_in * 1000)
					: null,
				scopes: config.scopes,
				isActive: true,
				lastError: null,
				lastErrorAt: null,
				metadata: tokenResponse.metadata || {},
			},
		});

		// Log activity
		await prisma.activity.create({
			data: {
				organizationId: stateData.organizationId,
				userId: stateData.userId,
				action: "integration.added",
				metadata: { source },
			},
		});

		return NextResponse.redirect(
			new URL(
				`/dashboard/integrations?success=${encodeURIComponent(`${source} connected successfully`)}`,
				req.url
			)
		);
	} catch (error) {
		console.error("OAuth callback error:", error);
		return NextResponse.redirect(
			new URL(
				`/dashboard/integrations?error=${encodeURIComponent((error as Error).message)}`,
				req.url
			)
		);
	}
}

async function exchangeCodeForTokens(
	source: ToolSource,
	code: string,
	config: OAuthConfig
): Promise<{
	access_token: string;
	refresh_token: string | null;
	expires_in: number | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	metadata?: any;
}> {
	const body = new URLSearchParams({
		grant_type: "authorization_code",
		code,
		client_id: config.clientId,
		client_secret: config.clientSecret,
		redirect_uri: config.redirectUri,
	});

	// Source-specific token exchange
	let headers: HeadersInit = {
		"Content-Type": "application/x-www-form-urlencoded",
	};

	if (source === "NOTION") {
		// Notion requires Basic Auth
		const auth = Buffer.from(
			`${config.clientId}:${config.clientSecret}`
		).toString("base64");
		headers = {
			"Content-Type": "application/json",
			Authorization: `Basic ${auth}`,
		};
	}

	const response = await fetch(config.tokenUrl, {
		method: "POST",
		headers,
		body:
			source === "NOTION"
				? JSON.stringify({
						grant_type: "authorization_code",
						code,
						redirect_uri: config.redirectUri,
					})
				: body,
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Token exchange failed: ${error}`);
	}

	const data = await response.json();

	// Handle source-specific response formats
	if (source === "SLACK") {
		return {
			access_token: data.access_token,
			refresh_token: data.refresh_token,
			expires_in: null, // Slack tokens don't expire
			metadata: {
				team_id: data.team?.id,
				team_name: data.team?.name,
			},
		};
	} else if (source === "JIRA") {
		return {
			access_token: data.access_token,
			refresh_token: data.refresh_token,
			expires_in: data.expires_in,
			metadata: {
				scope: data.scope,
			},
		};
	} else if (source === "NOTION") {
		return {
			access_token: data.access_token,
			refresh_token: null,
			expires_in: null,
			metadata: {
				workspace_id: data.workspace_id,
				workspace_name: data.workspace_name,
				bot_id: data.bot_id,
			},
		};
	}

	return {
		access_token: data.access_token,
		refresh_token: data.refresh_token,
		expires_in: data.expires_in,
		metadata: {},
	};
}
