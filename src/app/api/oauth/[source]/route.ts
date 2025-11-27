import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig } from "@/lib/oauth/config";
import { OAuthStateManager } from "@/lib/oauth/state-manager";
import { ToolSource } from "@prisma/client";
import { withAuth } from "@/lib/middleware";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ source: string }> }
) {
	return withAuth(req, async (req, user) => {
		const { source: defaultSource } = await params;
		try {
			const source = defaultSource.toUpperCase() as ToolSource;

			if (!Object.values(ToolSource).includes(source)) {
				return NextResponse.json(
					{ error: "Invalid source" },
					{ status: 400 }
				);
			}

			const config = getOAuthConfig(source);

			// Generate state for CSRF protection
			const state = OAuthStateManager.createState(
				source,
				user.organizationId,
				user.id
			);

			// Build authorization URL
			const authUrl = new URL(config.authorizationUrl);
			authUrl.searchParams.set("client_id", config.clientId);
			authUrl.searchParams.set("redirect_uri", config.redirectUri);
			authUrl.searchParams.set("state", state);

			if (config.scopes.length > 0) {
				authUrl.searchParams.set("scope", config.scopes.join(" "));
			}

			// Source-specific parameters
			if (source === "GOOGLE") {
				authUrl.searchParams.set("response_type", "code");
				authUrl.searchParams.set("access_type", "offline");
				authUrl.searchParams.set("prompt", "consent");
			} else if (source === "MICROSOFT") {
				authUrl.searchParams.set("response_type", "code");
				authUrl.searchParams.set("response_mode", "query");
			} else if (source === "DROPBOX") {
				authUrl.searchParams.set("response_type", "code");
				authUrl.searchParams.set("token_access_type", "offline");
			} else if (source === "JIRA") {
				authUrl.searchParams.set("response_type", "code");
				authUrl.searchParams.set("audience", "api.atlassian.com");
				authUrl.searchParams.set("prompt", "consent");
			} else if (source === "NOTION") {
				authUrl.searchParams.set("response_type", "code");
				authUrl.searchParams.set("owner", "user");
			} else {
				authUrl.searchParams.set("response_type", "code");
			}

			return NextResponse.redirect(authUrl.toString());
		} catch (error) {
			console.error("OAuth authorization error:", error);
			return NextResponse.redirect(
				new URL(
					`/dashboard/integrations?error=${encodeURIComponent((error as Error).message)}`,
					req.url
				)
			);
		}
	});
}
