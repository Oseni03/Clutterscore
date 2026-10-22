import BillingCard from "@/components/settings/billing-card";

export default function BillingPage() {
	return (
		<div className="w-full flex justify-center">
			<div className="w-full max-w-6xl p-6 space-y-6">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
					<div>
						<h1 className="text-2xl font-display font-semibold">
							Billing & Subscription
						</h1>
						<p className="text-muted-foreground">
							Manage your subscription and payment methods.
						</p>
					</div>
				</div>

				<BillingCard />
			</div>
		</div>
	);
}
