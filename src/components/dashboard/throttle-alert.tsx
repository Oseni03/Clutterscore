"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, Crown } from "lucide-react";
import { format } from "date-fns";

interface ThrottleInfo {
	error: string;
	resetDate?: string | null;
}

interface ThrottleAlertProps {
	throttleInfo: ThrottleInfo;
	onUpgrade: () => void;
}

export default function ThrottleAlert({
	throttleInfo,
	onUpgrade,
}: ThrottleAlertProps) {
	return (
		<Alert variant="destructive">
			<AlertCircle className="h-4 w-4 text-destructive" />
			<AlertDescription className="text-foreground">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
					<div className="space-y-1">
						<p className="font-medium">{throttleInfo.error}</p>
						{throttleInfo.resetDate && (
							<p className="text-sm flex items-center gap-1 text-muted-foreground">
								<Calendar className="h-3 w-3" />
								Next audit available:{" "}
								{format(
									new Date(throttleInfo.resetDate),
									"MMM d, yyyy"
								)}
							</p>
						)}
					</div>
					<Button
						size="sm"
						variant="outline"
						className="w-full md:w-auto"
						onClick={onUpgrade}
					>
						<Crown className="mr-2 h-4 w-4" />
						Upgrade to Pro
					</Button>
				</div>
			</AlertDescription>
		</Alert>
	);
}
