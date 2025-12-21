import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, Crown } from "lucide-react";
import { format } from "date-fns";

interface ThrottleInfo {
	error: string;
	resetDate?: string;
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
		<Alert
			variant="destructive"
			className="border-orange-600 bg-orange-50 dark:bg-orange-950"
		>
			<AlertCircle className="h-4 w-4 text-orange-600" />
			<AlertDescription className="text-orange-900 dark:text-orange-100">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
					<div className="space-y-1">
						<p className="font-medium">{throttleInfo.error}</p>
						{throttleInfo.resetDate && (
							<p className="text-sm flex items-center gap-1 text-orange-700 dark:text-orange-200">
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
						className="border-orange-600 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900 w-full md:w-auto"
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
