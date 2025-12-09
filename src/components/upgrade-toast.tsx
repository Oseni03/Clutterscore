import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Crown } from "lucide-react";

export const showUpgradeToast = (
	message: string,
	description: string,
	router: ReturnType<typeof useRouter>
) => {
	toast.error(message, {
		description,
		duration: 6000,
		action: {
			label: (
				<Button
					size="sm"
					variant="default"
					className="gap-2"
					onClick={() => router.push("/dashboard/settings/billing")}
				>
					<Crown className="h-4 w-4" />
					Upgrade
				</Button>
			),
			onClick: () => router.push("/dashboard/settings/billing"),
		},
	});
};
