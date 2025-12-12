import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { customSession, organization, magicLink } from "better-auth/plugins";
import { admin, member } from "./auth/permissions";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { getActiveOrganization } from "@/server/organizations";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { handleSubscriptionWebhook } from "@/server/polar";
import { SUBSCRIPTION_PLANS } from "./utils";
import OrganizationInvitationEmail from "@/components/emails/organization-invitation-email";
import MagicLinkEmail from "@/components/emails/magic-link-email";
import { APP_NAME } from "./config";
import { logger } from "./logger";
import { inngest } from "@/inngest/client";
import { render } from "@react-email/render";

const polarClient = new Polar({
	accessToken: process.env.POLAR_ACCESS_TOKEN!,
	server: "sandbox",
});

export const auth = betterAuth({
	appName: APP_NAME,
	baseURL: process.env.NEXT_PUBLIC_APP_URL,
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
		},
	},
	emailAndPassword: {
		enabled: false,
		requireEmailVerification: false,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		},
	},
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	onAPIError: {
		throw: true,
		onError: (error) => {
			logger.error("Auth error:", error);
		},
		errorURL: "/auth/error",
	},
	databaseHooks: {
		session: {
			create: {
				before: async (session) => {
					const organization = await getActiveOrganization(
						session.userId
					);
					return {
						data: {
							...session,
							activeOrganizationId: organization?.id || null,
							subscription: organization?.subscription || null,
						},
					};
				},
			},
		},
	},
	plugins: [
		organization({
			creatorRole: "admin",
			async sendInvitationEmail(data) {
				const htmlContent = await render(
					OrganizationInvitationEmail({
						// Render to HTML before sending
						organizationName: data.organization.name,
						inviterName: data.inviter.user.name || "Someone",
						inviteeEmail: data.email,
						invitationId: data.id,
						role: data.role,
					})
				);
				await inngest.send({
					name: "email/send",
					data: {
						to: data.email,
						subject: `Invitation to join ${data.organization.name} on ${APP_NAME}`,
						html: htmlContent,
					},
				});
			},
			roles: {
				admin,
				member,
			},
			schema: {
				organization: {
					additionalFields: {
						targetScore: {
							type: "number",
							input: true,
							required: true,
							defaultValue: 75,
						},
						subscriptionTier: {
							type: "string",
							input: true,
							required: true,
							defaultValue: "free",
						},
						polarCustomerId: {
							type: "string",
							input: true,
							required: false,
							defaultValue: "free",
						},
					},
				},
			},
		}),
		nextCookies(),
		customSession(async ({ user, session }) => {
			const organization = await getActiveOrganization(session.userId);
			return {
				user: {
					...user,
					role: organization?.role || null,
				},
				session,
				activeOrganizationId: organization?.id || null,
				subscription: organization?.subscription || null,
			};
		}),
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: SUBSCRIPTION_PLANS.flatMap((plan) => [
						{
							productId: plan.plans.monthly.productId,
							slug: `${plan.id}-monthly`,
						},
						{
							productId: plan.plans.yearly.productId,
							slug: `${plan.id}-yearly`,
						},
					]).filter((product) => product.productId),
					successUrl:
						"/dashboard/settings/billing?checkout_id={CHECKOUT_ID}",
					authenticatedUsersOnly: true,
				}),
				portal(),
				webhooks({
					secret: process.env.POLAR_WEBHOOK_SECRET!,
					onPayload: async (payload) => {
						logger.debug("Received Polar webhook:", payload);
						await handleSubscriptionWebhook(payload);
					},
				}),
			],
		}),
		magicLink({
			expiresIn: 60 * 5, // 5 minutes
			sendMagicLink: async ({ email, url }) => {
				const htmlContent = await render(
					MagicLinkEmail({ email, magicLink: url })
				);
				await inngest.send({
					name: "email/send",
					data: {
						to: email,
						subject: "Your Magic Link is Here!",
						html: htmlContent,
					},
				});
			},
		}),
	],
});

export type User = typeof auth.$Infer.Session.user;
export type Session = typeof auth.$Infer.Session;
