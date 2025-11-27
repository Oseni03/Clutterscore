import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, CreditCard, Receipt, Download } from "lucide-react";
import IntegrationsTab from "@/components/integrations/integrations-tab";

export default function SettingsPage() {
	return (
		<div className="p-6 space-y-6 mx-auto">
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
					<TabsTrigger value="integrations">Integrations</TabsTrigger>
					<TabsTrigger value="general">General</TabsTrigger>
					<TabsTrigger value="notifications">
						Notifications
					</TabsTrigger>
					<TabsTrigger value="billing">Billing</TabsTrigger>
				</TabsList>

				<TabsContent value="integrations" className="space-y-6">
					<IntegrationsTab />
				</TabsContent>

				<TabsContent value="general" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Organization Profile</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-2">
								<Label htmlFor="org-name">
									Organization Name
								</Label>
								<Input id="org-name" defaultValue="Acme Corp" />
							</div>
							<div className="grid gap-2">
								<Label htmlFor="admin-email">Admin Email</Label>
								<Input
									id="admin-email"
									defaultValue="admin@acme.com"
								/>
							</div>
						</CardContent>
					</Card>

					<Card className="border-destructive/50">
						<CardHeader>
							<CardTitle className="text-destructive">
								Danger Zone
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<div className="font-medium">
										Reset all data
									</div>
									<div className="text-sm text-muted-foreground">
										This will delete all history and scores.
									</div>
								</div>
								<Button variant="destructive">
									Reset Data
								</Button>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="notifications" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Alert Preferences</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label className="text-base">
										Weekly Report
									</Label>
									<div className="text-sm text-muted-foreground">
										Receive a summary of your clutter score
										every Monday.
									</div>
								</div>
								<Switch defaultChecked />
							</div>
							<Separator />
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label className="text-base">
										Critical Security Alerts
									</Label>
									<div className="text-sm text-muted-foreground">
										Immediate email when ghost access is
										detected.
									</div>
								</div>
								<Switch defaultChecked />
							</div>
							<Separator />
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label className="text-base">
										Storage Limits
									</Label>
									<div className="text-sm text-muted-foreground">
										Notify when storage waste exceeds 1TB.
									</div>
								</div>
								<Switch />
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="billing" className="space-y-6">
					<div className="grid gap-6 md:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Current Plan</CardTitle>
								<CardDescription>
									You are on the Pro Plan
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-baseline gap-2">
									<span className="text-3xl font-bold">
										$290
									</span>
									<span className="text-muted-foreground">
										/year
									</span>
								</div>
								<div className="text-sm text-muted-foreground">
									Includes 50 users and unlimited automated
									cleanups.
								</div>
								<Separator />
								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span>Users</span>
										<span className="font-medium">
											42 / 50
										</span>
									</div>
									<div className="h-2 bg-secondary rounded-full overflow-hidden">
										<div className="h-full bg-primary w-[84%]" />
									</div>
								</div>
							</CardContent>
							<CardFooter>
								<Button className="w-full">Upgrade Plan</Button>
							</CardFooter>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Payment Method</CardTitle>
								<CardDescription>
									Manage your billing details
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center gap-4 p-4 border rounded-lg">
									<div className="h-10 w-14 bg-muted rounded flex items-center justify-center">
										<CreditCard className="h-6 w-6" />
									</div>
									<div>
										<div className="font-medium">
											Visa ending in 4242
										</div>
										<div className="text-sm text-muted-foreground">
											Expires 12/2026
										</div>
									</div>
								</div>
							</CardContent>
							<CardFooter>
								<Button variant="outline" className="w-full">
									Update Payment Method
								</Button>
							</CardFooter>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Invoice History</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{[
									{
										id: "INV-2024-001",
										date: "Jan 1, 2025",
										amount: "$290.00",
										status: "Paid",
									},
									{
										id: "INV-2023-012",
										date: "Jan 1, 2024",
										amount: "$290.00",
										status: "Paid",
									},
								].map((invoice) => (
									<div
										key={invoice.id}
										className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors"
									>
										<div className="flex items-center gap-4">
											<div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
												<Receipt className="h-4 w-4 text-muted-foreground" />
											</div>
											<div>
												<div className="font-medium text-sm">
													{invoice.id}
												</div>
												<div className="text-xs text-muted-foreground">
													{invoice.date}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<span className="text-sm font-medium">
												{invoice.amount}
											</span>
											<Badge
												variant="outline"
												className="text-emerald-600 border-emerald-200 bg-emerald-50"
											>
												{invoice.status}
											</Badge>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
											>
												<Download className="h-4 w-4" />
											</Button>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
