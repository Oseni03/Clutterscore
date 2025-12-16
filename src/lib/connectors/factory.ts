import { ToolSource } from "@prisma/client";
import { BaseConnector, ConnectorConfig } from "./types";
import { SlackConnector } from "./slack";
import { GoogleConnector } from "./google";
// import { MicrosoftConnector } from "./microsoft";
import { NotionConnector } from "./notion";
import { DropboxConnector } from "./dropbox";
import { FigmaConnector } from "./figma";
import { JiraConnector } from "./jira";

export class ConnectorFactory {
	static create(source: ToolSource, config: ConnectorConfig): BaseConnector {
		switch (source) {
			case "SLACK":
				return new SlackConnector(config);
			case "GOOGLE":
				return new GoogleConnector(config);
			// case "MICROSOFT":
			// 	return new MicrosoftConnector(config);
			case "NOTION":
				return new NotionConnector(config);
			case "DROPBOX":
				return new DropboxConnector(config);
			case "FIGMA":
				return new FigmaConnector(config);
			case "JIRA":
				// Validate Jira-specific metadata before creating connector
				if (!config.metadata?.cloudId) {
					throw new Error(
						"Jira cloudId is required in config.metadata. Ensure the OAuth callback properly stored cloudId during integration setup."
					);
				}
				return new JiraConnector(config);
			default:
				throw new Error(`Unsupported connector: ${source}`);
		}
	}
}
