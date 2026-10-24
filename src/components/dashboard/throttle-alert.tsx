"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";

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
		<div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background px-5 py-4">
			<span className="size-2.5 rounded-full bg-[#F4B183]" />
			<div className="min-w-0 flex-1 basis-[320px] text-sm">
				<span className="font-semibold">{throttleInfo.error}</span>{" "}
				{throttleInfo.resetDate && (
					<span className="text-muted-foreground">
						Your next audit is available{" "}
						{format(new Date(throttleInfo.resetDate), "MMM d, yyyy")}.
					</span>
				)}
			</div>
			<Button
				size="sm"
				onClick={onUpgrade}
				className="h-9 rounded-full px-[18px] text-[13px]"
			>
				Upgrade
			</Button>
		</div>
	);
}
