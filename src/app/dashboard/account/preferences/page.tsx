import { AccountHeader } from "@/components/account/account-header";
import { ThemeCard } from "@/components/settings/theme";

export default function AccountPreferencesPage() {
	return (
		<div className="space-y-6">
			<AccountHeader
				active="preferences"
				title="Account Preferences"
				subtitle="Choose how Clutterscore looks for you. Your choice is saved on this device."
			/>
			<ThemeCard />
		</div>
	);
}
