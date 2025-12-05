import IntegrationsTab from "@/components/settings/integrations-tab";

export default function IntegrationsPage() {
	return (
		<div className="w-full flex justify-center">
			<div className="w-full max-w-6xl p-6 space-y-6">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
					<div>
						<h1 className="text-2xl font-display font-bold">
							Integrations
						</h1>
						<p className="text-muted-foreground">
							Connect and manage your workspace integrations.
						</p>
					</div>
				</div>

				<IntegrationsTab />
			</div>
		</div>
	);
}
