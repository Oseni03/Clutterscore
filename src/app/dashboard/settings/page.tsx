import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IntegrationsTab from "@/components/integrations/integrations-tab";
import GeneralTab from "@/components/settings/general-tab";
import OrganizationCard from "@/components/settings/organizations";
import MembersCard from "@/components/settings/members";
import BillingCard from "@/components/settings/billing-card";
import { Save } from "lucide-react";

export default function SettingsPage() {
	return (
		<div className="w-full flex justify-center">
			<div className="w-full max-w-6xl p-6 space-y-6">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
					<div>
						<h1 className="text-2xl font-display font-bold">
							Settings
						</h1>
						<p className="text-muted-foreground">
							Manage your integrations and preferences.
						</p>
					</div>
					<Button>
						<Save className="mr-2 h-4 w-4" />
						Save Changes
					</Button>
				</div>

				<Tabs defaultValue="integrations" className="space-y-6">
					<TabsList>
						<TabsTrigger value="integrations">
							Integrations
						</TabsTrigger>
						<TabsTrigger value="organization">
							Organization
						</TabsTrigger>
						<TabsTrigger value="members">Users</TabsTrigger>
						{/* Notifications tab removed - preferences moved into Organization */}
						<TabsTrigger value="billing">Billing</TabsTrigger>
					</TabsList>

					<TabsContent value="integrations" className="space-y-6">
						<IntegrationsTab />
					</TabsContent>

					<TabsContent value="organization" className="space-y-6">
						<div className="grid gap-6 md:grid-cols-1">
							<OrganizationCard />
							{/* Merge General settings into Organization tab */}
							<div>
								<GeneralTab />
							</div>
						</div>
					</TabsContent>

					<TabsContent value="members" className="space-y-6">
						<MembersCard />
					</TabsContent>

					<TabsContent value="billing" className="space-y-6">
						<BillingCard />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
