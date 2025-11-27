import { randomBytes } from "crypto";
import { ToolSource } from "@prisma/client";

interface OAuthState {
	state: string;
	source: ToolSource;
	organizationId: string;
	userId: string;
	createdAt: number;
}

// In-memory store for OAuth states (use Redis in production)
const stateStore = new Map<string, OAuthState>();

// Clean up expired states (older than 10 minutes)
setInterval(() => {
	const now = Date.now();
	for (const [state, data] of stateStore.entries()) {
		if (now - data.createdAt > 10 * 60 * 1000) {
			stateStore.delete(state);
		}
	}
}, 60 * 1000);

export class OAuthStateManager {
	static createState(
		source: ToolSource,
		organizationId: string,
		userId: string
	): string {
		const state = randomBytes(32).toString("hex");

		stateStore.set(state, {
			state,
			source,
			organizationId,
			userId,
			createdAt: Date.now(),
		});

		return state;
	}

	static verifyState(state: string): OAuthState | null {
		const data = stateStore.get(state);

		if (!data) {
			return null;
		}

		// Check if expired (10 minutes)
		if (Date.now() - data.createdAt > 10 * 60 * 1000) {
			stateStore.delete(state);
			return null;
		}

		// Delete after use
		stateStore.delete(state);

		return data;
	}
}
