import { Button } from "@/components/ui/button";

interface NoFilteredMessageProps {
	onClear: () => void;
}

export default function NoFilteredMessage({
	onClear,
}: NoFilteredMessageProps) {
	return (
		<div className="flex flex-col items-center rounded-xl border border-border bg-background px-6 py-16 text-center sm:px-8">
			<h2 className="font-display text-[28px] font-semibold tracking-[-0.03em]">
				No playbooks match
			</h2>
			<p className="mt-3 max-w-[420px] text-muted-foreground">
				Try a different search or impact filter.
			</p>
			<Button
				onClick={onClear}
				variant="secondary"
				className="mt-6 h-12 px-7"
			>
				Clear filters
			</Button>
		</div>
	);
}
