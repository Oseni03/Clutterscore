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
			// User & Team Info
			"users:read", // List users and basic info
			"users:read.email", // Get user email addresses
			"team:read", // Organization info

			// Channel Management
			"channels:read", // List public channels
			"groups:read", // List private channels
			"channels:manage", // Archive channels (for playbooks)
			"groups:write", // Archive private channels

			// File Access
			"files:read", // List and read files
			"files:write", // Delete files (for cleanup playbooks)

			// Guest & Access Management
			"admin.users:read", // List guests and members (requires admin)
			"admin.users:write", // Remove users/guests (playbooks)

			// Activity & Analytics
			"channels:history", // Read message history (for activity detection)
			"groups:history", // Private channel history
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/slack/callback`,
	},
	GOOGLE: {
		authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
		tokenUrl: "https://oauth2.googleapis.com/token",
		clientId: process.env.GOOGLE_CLIENT_ID!,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		scopes: [
			// Drive
			"https://www.googleapis.com/auth/drive.readonly", // List all files
			"https://www.googleapis.com/auth/drive.metadata.readonly", // File metadata
			"https://www.googleapis.com/auth/drive.file", // Manage specific files (delete)

			// Admin SDK (requires super admin)
			"https://www.googleapis.com/auth/admin.directory.user.readonly", // List users
			"https://www.googleapis.com/auth/admin.directory.group.readonly", // List groups
			"https://www.googleapis.com/auth/admin.reports.audit.readonly", // Audit logs
			"https://www.googleapis.com/auth/admin.directory.device.chromeos.readonly", // Devices

			// Gmail (optional, for email audits)
			"https://www.googleapis.com/auth/gmail.readonly", // Email metadata
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
			// OneDrive/SharePoint
			"Files.Read.All", // Read all files
			"Files.ReadWrite.All", // Delete files (playbooks)
			"Sites.Read.All", // SharePoint sites

			// Users & Groups
			"User.Read.All", // List users
			"Group.Read.All", // List groups/teams
			"Directory.Read.All", // Org directory (guests, licenses)

			// Teams (optional)
			"Team.ReadBasic.All", // List teams
			"Channel.ReadBasic.All", // List channels

			// Admin (requires admin consent)
			"Reports.Read.All", // Usage reports
			"AuditLog.Read.All", // Audit logs
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/microsoft/callback`,
	},
	NOTION: {
		authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
		tokenUrl: "https://api.notion.com/v1/oauth/token",
		clientId: process.env.NOTION_CLIENT_ID!,
		clientSecret: process.env.NOTION_CLIENT_SECRET!,
		scopes: [],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/notion/callback`,
	},
	DROPBOX: {
		authorizationUrl: "https://www.dropbox.com/oauth2/authorize",
		tokenUrl: "https://api.dropboxapi.com/oauth2/token",
		clientId: process.env.DROPBOX_CLIENT_ID!,
		clientSecret: process.env.DROPBOX_CLIENT_SECRET!,
		scopes: [
			"files.metadata.read", // List files & metadata
			"files.content.read", // Read file content (for hash)
			"sharing.read", // Shared link info
			"team_data.content.read", // Team files (if applicable)
			"team_info.read", // Team info
			"members.read", // Team members
			"files.permanent_delete", // Delete files (playbooks)
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/dropbox/callback`,
	},
	FIGMA: {
		authorizationUrl: "https://www.figma.com/oauth",
		tokenUrl: "https://www.figma.com/api/oauth/token",
		clientId: process.env.FIGMA_CLIENT_ID!,
		clientSecret: process.env.FIGMA_CLIENT_SECRET!,
		scopes: [
			"file_comments:read",
			"file_metadata:read",
			"file_versions:read",
			"projects:read",
			"webhooks:read",
			"webhooks:write",
			"team_library_content:read",
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/figma/callback`,
	},
	LINEAR: {
		authorizationUrl: "https://linear.app/oauth/authorize",
		tokenUrl: "https://api.linear.app/oauth/token",
		clientId: process.env.LINEAR_CLIENT_ID!,
		clientSecret: process.env.LINEAR_CLIENT_SECRET!,
		scopes: [
			"read", // Read all data
			"write", // Manage issues/projects (optional)
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/linear/callback`,
	},
	JIRA: {
		authorizationUrl: "https://auth.atlassian.com/authorize",
		tokenUrl: "https://auth.atlassian.com/oauth/token",
		clientId: process.env.JIRA_CLIENT_ID!,
		clientSecret: process.env.JIRA_CLIENT_SECRET!,
		scopes: [
			"read:jira-work", // Read projects/issues
			"read:jira-user", // Read users
			"manage:jira-project", // Manage projects (playbooks)
			"write:jira-work",
			"manage:jira-webhook",
		],
		redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/jira/callback`,
	},
};

export function getOAuthConfig(source: ToolSource): OAuthConfig {
	const config = OAUTH_CONFIGS[source];
	if (!config) {
		throw new Error(`OAuth config not found for ${source}`);
	}
	return config;
}
