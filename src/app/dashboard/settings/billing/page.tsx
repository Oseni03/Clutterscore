import BillingCard from "@/components/settings/billing-card";
import { SettingsHeader } from "@/components/settings/settings-header";

export default function BillingPage() {
	return (
		<div className="space-y-6 p-6 md:p-8">
			<SettingsHeader title="Billing" />
			<BillingCard />
		</div>
	);
}
