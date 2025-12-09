import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { authClient } from "@/lib/auth-client";
import { Subscription } from "@prisma/client";
import { logger } from "better-auth";

export interface SubscriptionState {
	subscription: Subscription | null;
	loading: boolean;
	error: string | null;
}

interface SubscriptionActions {
	loadSubscription: (organizationId: string) => Promise<void>;
	subscribe: (organizationId: string, products: string[]) => Promise<void>;
	openPortal: () => Promise<void>;
	updateSubscription: (subscription: Subscription) => void;
	clearSubscription: () => void;
	setError: (error: string | null) => void;
}

export type SubscriptionStore = SubscriptionState & SubscriptionActions;

export const defaultInitState: SubscriptionState = {
	// Initial state
	subscription: null,
	loading: false,
	error: null,
};

export const createSubscriptionStore = (
	initState: SubscriptionState = defaultInitState
) => {
	return create<SubscriptionStore>()(
		devtools(
			(set) => ({
				...initState,

				// Actions
				loadSubscription: async (organizationId: string) => {
					if (!organizationId) return;

					set((state) => ({ ...state, loading: true, error: null }));

					try {
						const response = await fetch(
							`/api/subscription/${organizationId}`
						);

						if (!response.ok) {
							if (response.status === 404) {
								set((state) => ({
									...state,
									subscription: null,
									loading: false,
								}));
								return;
							}
							throw new Error("Failed to fetch subscription");
						}

						const { data } = await response.json();
						set((state) => ({
							...state,
							subscription: data,
							loading: false,
						}));
					} catch (error) {
						logger.error(
							"SUBSCRIPTION_STORE - Error loading subscription:",
							error
						);
						set((state) => ({
							...state,
							error:
								error instanceof Error
									? error.message
									: "Failed to load subscription",
							loading: false,
						}));
					}
				},

				subscribe: async (
					organizationId: string,
					products: string[]
				) => {
					if (!organizationId) {
						set({ error: "Organization ID required" });
						return;
					}

					set((state) => ({ ...state, loading: true, error: null }));

					try {
						await authClient.checkout({
							products,
							referenceId: organizationId,
						});
						// Note: subscription will be updated via webhook after successful checkout
					} catch (error) {
						logger.error(
							"SUBSCRIPTION_STORE - Error creating checkout:",
							error
						);
						set((state) => ({
							...state,
							error:
								error instanceof Error
									? error.message
									: "Failed to create checkout",
							loading: false,
						}));
						throw error;
					}
				},

				openPortal: async () => {
					set((state) => ({ ...state, loading: true, error: null }));

					try {
						await authClient.customer.portal();
						set({ loading: false });
					} catch (error) {
						logger.error(
							"SUBSCRIPTION_STORE - Error opening customer portal:",
							error
						);
						set((state) => ({
							...state,
							error:
								error instanceof Error
									? error.message
									: "Failed to open customer portal",
							loading: false,
						}));
						throw error;
					}
				},

				updateSubscription: (subscription: Subscription) => {
					set((state) => ({ ...state, subscription }));
				},

				clearSubscription: () => {
					set((state) => ({
						...state,
						subscription: null,
						error: null,
					}));
				},

				setError: (error: string | null) => {
					set((state) => ({ ...state, error }));
				},
			}),
			{
				name: "subscription-store",
			}
		)
	);
};
