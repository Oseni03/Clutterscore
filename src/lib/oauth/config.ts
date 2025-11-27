import { ToolSource } from "@prisma/client";

export interface OAuthConfig {
	authorizationUrl: string;
	tokenUrl: string;
	clientId: string;
	clientSecret: string;
	scopes: string[];
	redirectUri: string;
}

export const OAUTH_CONFIGS: Record<ToolSource, OAuthConfig> = {
	SLACK: {
		authorizationUrl: "https://slack.com/oauth/v2/authorize",
		tokenUrl: "https://slack.com/api/oauth.v2.access",
		clientId: process.env.SLACK_CLIENT_ID!,
		clientSecret: process.env.SLACK_CLIENT_SECRET!,
		scopes: [
			"files:read",
			"users:read",
			"channels:read",
			"groups:read",
			"team:read",
			"files:write",
			"channels:manage",
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/slack`,
	},
	GOOGLE: {
		authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
		tokenUrl: "https://oauth2.googleapis.com/token",
		clientId: process.env.GOOGLE_CLIENT_ID!,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		scopes: [
			"https://www.googleapis.com/auth/drive.readonly",
			"https://www.googleapis.com/auth/admin.directory.user.readonly",
			"https://www.googleapis.com/auth/admin.directory.group.readonly",
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/google`,
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
			"Directory.Read.All",
			"offline_access",
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/microsoft`,
	},
	NOTION: {
		authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
		tokenUrl: "https://api.notion.com/v1/oauth/token",
		clientId: process.env.NOTION_CLIENT_ID!,
		clientSecret: process.env.NOTION_CLIENT_SECRET!,
		scopes: [],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/notion`,
	},
	DROPBOX: {
		authorizationUrl: "https://www.dropbox.com/oauth2/authorize",
		tokenUrl: "https://api.dropboxapi.com/oauth2/token",
		clientId: process.env.DROPBOX_CLIENT_ID!,
		clientSecret: process.env.DROPBOX_CLIENT_SECRET!,
		scopes: [
			"files.metadata.read",
			"files.content.read",
			"sharing.read",
			"team_data.member",
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/dropbox`,
	},
	FIGMA: {
		authorizationUrl: "https://www.figma.com/oauth",
		tokenUrl: "https://www.figma.com/api/oauth/token",
		clientId: process.env.FIGMA_CLIENT_ID!,
		clientSecret: process.env.FIGMA_CLIENT_SECRET!,
		scopes: ["file_read"],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/figma`,
	},
	LINEAR: {
		authorizationUrl: "https://linear.app/oauth/authorize",
		tokenUrl: "https://api.linear.app/oauth/token",
		clientId: process.env.LINEAR_CLIENT_ID!,
		clientSecret: process.env.LINEAR_CLIENT_SECRET!,
		scopes: ["read"],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/linear`,
	},
	JIRA: {
		authorizationUrl: "https://auth.atlassian.com/authorize",
		tokenUrl: "https://auth.atlassian.com/oauth/token",
		clientId: process.env.JIRA_CLIENT_ID!,
		clientSecret: process.env.JIRA_CLIENT_SECRET!,
		scopes: ["read:jira-user", "read:jira-work", "offline_access"],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/jira`,
	},
};

export function getOAuthConfig(source: ToolSource): OAuthConfig {
	const config = OAUTH_CONFIGS[source];
	if (!config) {
		throw new Error(`OAuth config not found for ${source}`);
	}
	return config;
}
