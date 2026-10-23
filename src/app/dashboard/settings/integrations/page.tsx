import IntegrationsTab from "@/components/settings/integrations-tab";
import { SettingsHeader } from "@/components/settings/settings-header";

export default function IntegrationsPage() {
	return (
		<div className="mx-auto w-full max-w-[960px] space-y-6 p-6 md:p-8">
			<SettingsHeader />
			<IntegrationsTab />
		</div>
	);
}
