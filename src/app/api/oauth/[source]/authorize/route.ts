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
		const { source: sourceParam } = await params;

		try {
			const source = sourceParam.toUpperCase() as ToolSource;

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
			authUrl.searchParams.set("response_type", "code");

			// Source-specific configurations
			switch (source) {
				case "GOOGLE":
					authUrl.searchParams.set("scope", config.scopes.join(" "));
					authUrl.searchParams.set("access_type", "offline");
					authUrl.searchParams.set("prompt", "consent");
					authUrl.searchParams.set("include_granted_scopes", "true");
					break;

				case "SLACK":
					// Slack uses comma-separated scopes in v2 API
					authUrl.searchParams.set("scope", config.scopes.join(","));
					authUrl.searchParams.set(
						"user_scope",
						config.user_scopes?.join(",") || ""
					);
					break;

				case "MICROSOFT":
					authUrl.searchParams.set("scope", config.scopes.join(" "));
					authUrl.searchParams.set("response_mode", "query");
					authUrl.searchParams.set("prompt", "consent");
					break;

				case "DROPBOX":
					// Dropbox doesn't use scope parameter in authorization URL
					// Scopes are configured in the Dropbox App Console
					authUrl.searchParams.delete("scope");
					authUrl.searchParams.set("token_access_type", "offline");
					authUrl.searchParams.set("force_reapprove", "true");
					break;

				case "FIGMA":
					authUrl.searchParams.set("scope", config.scopes.join(","));
					authUrl.searchParams.set("response_type", "code");
					break;

				case "LINEAR":
					authUrl.searchParams.set("scope", config.scopes.join(","));
					authUrl.searchParams.set("prompt", "consent");
					// Linear uses actor=application for OAuth apps
					authUrl.searchParams.set("actor", "application");
					break;

				case "JIRA":
					authUrl.searchParams.set("scope", config.scopes.join(" "));
					authUrl.searchParams.set("audience", "api.atlassian.com");
					authUrl.searchParams.set("prompt", "consent");
					break;

				case "NOTION":
					// Notion doesn't use traditional scopes
					authUrl.searchParams.delete("scope");
					authUrl.searchParams.set("owner", "user");
					break;

				default:
					if (config.scopes.length > 0) {
						authUrl.searchParams.set(
							"scope",
							config.scopes.join(" ")
						);
					}
			}

			console.log(
				`[OAuth] Redirecting to ${source}:`,
				authUrl.toString()
			);

			return NextResponse.redirect(authUrl.toString());
		} catch (error) {
			console.error("OAuth authorization error:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			return NextResponse.redirect(
				new URL(
					`/dashboard/settings?tab=integrations&error=${encodeURIComponent(errorMessage)}`,
					process.env.NEXT_PUBLIC_APP_URL || req.url
				)
			);
		}
	});
}
