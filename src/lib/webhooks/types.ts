/* eslint-disable @typescript-eslint/no-explicit-any */
export interface WebhookEvent {
	source: string;
	eventType: string;
	data: any;
	timestamp: Date;
}

export interface WebhookHandler {
	verify(req: Request): Promise<boolean>;
	handle(event: WebhookEvent): Promise<void>;
}
