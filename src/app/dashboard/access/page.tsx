import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	ShieldAlert,
	UserX,
	Key,
	Globe,
	MoreHorizontal,
	CheckCircle2,
} from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

const riskyUsers = [
	{
		name: "Sarah Connor",
		email: "sarah@skynet.com",
		role: "Contractor",
		riskLevel: "Critical",
		reason: "Account Disabled in IDP but has Active Slack Token",
		apps: ["Slack", "Dropbox"],
	},
	{
		name: "Guest User (External)",
		email: "client@agency.com",
		role: "Guest",
		riskLevel: "High",
		reason: "Access to 'Financials' folder, no login in 90 days",
		apps: ["Google Drive"],
	},
	{
		name: "Dev Service Acct",
		email: "bot-ci@acme.com",
		role: "Service Account",
		riskLevel: "Medium",
		reason: "Admin permissions with no MFA",
		apps: ["GitHub", "AWS"],
	},
	{
		name: "Michael Scott",
		email: "mscott@paper.com",
		role: "Ex-Employee",
		riskLevel: "Critical",
		reason: "Left company 14 months ago. Still has access.",
		apps: ["Notion", "Figma", "Slack"],
	},
];

export default function AccessPage() {
	return (
		<div className="p-6 space-y-6">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
				<div>
					<h1 className="text-2xl font-display font-bold">
						Access Review
					</h1>
					<p className="text-muted-foreground">
						Detect and revoke risky access permissions.
					</p>
				</div>
			</div>

			{/* Risk Summary */}
			<div className="grid md:grid-cols-3 gap-6 mb-8">
				<Card className="bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/50">
					<CardContent className="pt-6">
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
								<UserX className="h-6 w-6" />
							</div>
							<div>
								<div className="text-2xl font-bold text-red-700 dark:text-red-400">
									12
								</div>
								<div className="text-sm font-medium text-red-600/80 dark:text-red-400/80">
									Ghost Accounts
								</div>
							</div>
						</div>
						<p className="text-xs text-red-600/60 mt-4">
							Users who left but still have access.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
								<Globe className="h-6 w-6" />
							</div>
							<div>
								<div className="text-2xl font-bold">156</div>
								<div className="text-sm font-medium text-muted-foreground">
									Public Links
								</div>
							</div>
						</div>
						<p className="text-xs text-muted-foreground mt-4">
							Files accessible by anyone on the internet.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
								<Key className="h-6 w-6" />
							</div>
							<div>
								<div className="text-2xl font-bold">8</div>
								<div className="text-sm font-medium text-muted-foreground">
									Admin Accounts
								</div>
							</div>
						</div>
						<p className="text-xs text-muted-foreground mt-4">
							Super-admin privileges across tools.
						</p>
					</CardContent>
				</Card>
			</div>

			{/* User Table */}
			<Card>
				<CardHeader>
					<CardTitle>High Risk Users</CardTitle>
					<CardDescription>
						Immediate attention required for these accounts.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Risk Factor</TableHead>
								<TableHead>Affected Apps</TableHead>
								<TableHead className="text-right">
									Action
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{riskyUsers.map((user, i) => (
								<TableRow key={i}>
									<TableCell>
										<div className="flex items-center gap-3">
											<Avatar className="h-8 w-8">
												<AvatarImage
													src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
												/>
												<AvatarFallback>
													{user.name.substring(0, 2)}
												</AvatarFallback>
											</Avatar>
											<div>
												<div className="font-medium text-sm">
													{user.name}
												</div>
												<div className="text-xs text-muted-foreground">
													{user.email}
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant="outline">
											{user.role}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											<Badge
												className={
													user.riskLevel ===
													"Critical"
														? "bg-destructive hover:bg-destructive/90"
														: "bg-orange-500 hover:bg-orange-600"
												}
											>
												{user.riskLevel}
											</Badge>
											<div className="text-xs text-muted-foreground max-w-[200px] leading-tight">
												{user.reason}
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex gap-1 flex-wrap">
											{user.apps.map((app) => (
												<span
													key={app}
													className="text-xs bg-muted px-1.5 py-0.5 rounded border border-border"
												>
													{app}
												</span>
											))}
										</div>
									</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
												>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuLabel>
													Actions
												</DropdownMenuLabel>
												<DropdownMenuItem className="text-destructive">
													<UserX className="mr-2 h-4 w-4" />
													Revoke All Access
												</DropdownMenuItem>
												<DropdownMenuItem>
													<ShieldAlert className="mr-2 h-4 w-4" />
													<Link
														href="/dashboard/audit-logs"
														className="w-full"
													>
														View Audit Logs
													</Link>
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem>
													<CheckCircle2 className="mr-2 h-4 w-4" />
													Mark as Safe
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
