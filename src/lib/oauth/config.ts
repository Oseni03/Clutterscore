import { ToolSource } from "@prisma/client";

export interface OAuthConfig {
	authorizationUrl: string;
	tokenUrl: string;
	clientId: string;
	clientSecret: string;
	scopes: string[];
	user_scopes?: string[];
	redirectUri: string;
}

export const OAUTH_CONFIGS: Record<ToolSource, OAuthConfig> = {
	SLACK: {
		authorizationUrl: "https://slack.com/oauth/v2/authorize",
		tokenUrl: "https://slack.com/api/oauth.v2.access",
		clientId: process.env.SLACK_CLIENT_ID!,
		clientSecret: process.env.SLACK_CLIENT_SECRET!,
		// Slack OAuth v2 requires ONLY bot scopes in the main scope parameter
		// User scopes must be in user_scope parameter (handled in authorize route)
		scopes: [
			"channels:read",
			"groups:read",
			"channels:manage",
			"groups:write",
			"files:read",
			"files:write",
			"channels:history",
			"groups:history",
			"users:read",
			"users:read.email",
			"team:read",
		],
		user_scopes: [
			// Admin scopes - requires workspace app + admin approval
			// Only add if your app is configured as a workspace app
			// "admin.users:read",
			// "admin.users:write",
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/slack/callback`,
	},

	GOOGLE: {
		authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
		tokenUrl: "https://oauth2.googleapis.com/token",
		clientId: process.env.GOOGLE_CLIENT_ID!,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		scopes: [
			// Drive scopes
			"https://www.googleapis.com/auth/drive.readonly",
			"https://www.googleapis.com/auth/drive.metadata.readonly",

			// Admin SDK - requires domain-wide delegation
			// Comment out if you don't have super admin access
			// "https://www.googleapis.com/auth/admin.directory.user.readonly",
			// "https://www.googleapis.com/auth/admin.directory.group.readonly",
			// "https://www.googleapis.com/auth/admin.reports.audit.readonly",
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google/callback`,
	},

	MICROSOFT: {
		authorizationUrl:
			"https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
		tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
		clientId: process.env.MICROSOFT_CLIENT_ID!,
		clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
		scopes: [
			"Files.Read.All",
			"Sites.Read.All",
			"User.Read.All",
			"Group.Read.All",
			"offline_access", // Required for refresh tokens

			// Admin scopes - require admin consent
			// "Directory.Read.All",
			// "Reports.Read.All",
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/microsoft/callback`,
	},

	NOTION: {
		authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
		tokenUrl: "https://api.notion.com/v1/oauth/token",
		clientId: process.env.NOTION_CLIENT_ID!,
		clientSecret: process.env.NOTION_CLIENT_SECRET!,
		// Notion doesn't use OAuth scopes - permissions are set in integration settings
		scopes: [],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/notion/callback`,
	},

	DROPBOX: {
		authorizationUrl: "https://www.dropbox.com/oauth2/authorize",
		tokenUrl: "https://api.dropboxapi.com/oauth2/token",
		clientId: process.env.DROPBOX_CLIENT_ID!,
		clientSecret: process.env.DROPBOX_CLIENT_SECRET!,
		scopes: [
			// "files.metadata.read", // List files & metadata
			// "files.content.read", // Read file content (for hash)
			// "sharing.read", // Shared link info
			// "team_data.content.read", // Team files (if applicable)
			// "team_info.read", // Team info
			// "members.read", // Team members
			// "files.permanent_delete", // Delete files (playbooks)
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/dropbox/callback`,
	},

	FIGMA: {
		authorizationUrl: "https://www.figma.com/oauth",
		tokenUrl: "https://www.figma.com/api/oauth/token",
		clientId: process.env.FIGMA_CLIENT_ID!,
		clientSecret: process.env.FIGMA_CLIENT_SECRET!,
		// Figma only supports: file_read (default, always granted)
		// Other scopes must be configured in your Figma app settings
		scopes: ["file_read"],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/figma/callback`,
	},

	JIRA: {
		authorizationUrl: "https://auth.atlassian.com/authorize",
		tokenUrl: "https://auth.atlassian.com/oauth/token",
		clientId: process.env.JIRA_CLIENT_ID!,
		clientSecret: process.env.JIRA_CLIENT_SECRET!,
		scopes: [
			"read:jira-work",
			"read:jira-user",
			"offline_access", // Required for refresh tokens
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/jira/callback`,
	},
};

export function getOAuthConfig(source: ToolSource): OAuthConfig {
	const config = OAUTH_CONFIGS[source];
	if (!config) {
		throw new Error(`OAuth config not found for ${source}`);
	}

	// Validate required environment variables
	if (!config.clientId || config.clientId.includes("undefined")) {
		throw new Error(
			`Missing client ID for ${source}. Check your .env file.`
		);
	}
	if (!config.clientSecret || config.clientSecret.includes("undefined")) {
		throw new Error(
			`Missing client secret for ${source}. Check your .env file.`
		);
	}
	if (!process.env.NEXT_PUBLIC_APP_URL) {
		throw new Error(
			"NEXT_PUBLIC_APP_URL is not set in environment variables"
		);
	}

	return config;
}
