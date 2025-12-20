import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware";
import { UserCountService } from "@/server/user-count-service";
import { getEligiblePlans, getRecommendedTier } from "@/lib/subscription-plans";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const userCountData = await UserCountService.getUserCount(
				user.organizationId,
				false
			);

			const { userCount, source, lastSync, verified } = userCountData;

			if (userCount === 0 || !userCount) {
				return NextResponse.json({
					eligiblePlans: [],
					recommendedPlan: null,
					userCount: 0,
					userCountSource: null,
					userCountLastSync: null,
					userCountVerified: false,
					needsUserCountSync: true,
					message:
						"Please connect Google Workspace, Dropbox, or Slack to detect your user count",
				});
			}

			const eligiblePlans = getEligiblePlans(userCount);
			const recommendedPlan = getRecommendedTier(userCount);

			return NextResponse.json({
				eligiblePlans: eligiblePlans.map((plan) => ({
					id: plan.id,
					name: plan.name,
					description: plan.description,
					minUsers: plan.minUsers,
					maxUsers: plan.maxUsers,
					price: plan.plans.yearly.price,
					priceValue: plan.plans.yearly.priceValue,
					features: plan.features,
					popular: plan.popular,
				})),
				recommendedPlan: recommendedPlan
					? {
							id: recommendedPlan.id,
							name: recommendedPlan.name,
							description: recommendedPlan.description,
							minUsers: recommendedPlan.minUsers,
							maxUsers: recommendedPlan.maxUsers,
						}
					: null,
				userCount,
				userCountSource: source,
				userCountLastSync: lastSync,
				userCountVerified: verified,
				needsUserCountSync: false,
			});
		} catch (error) {
			logger.error("Failed to fetch eligible plans:", error);
			return NextResponse.json(
				{
					error:
						(error as Error).message ||
						"Failed to fetch eligible plans",
				},
				{ status: 500 }
			);
		}
	});
}
