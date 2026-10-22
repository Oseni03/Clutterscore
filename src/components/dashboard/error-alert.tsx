interface ErrorAlertProps {
	message: string;
}

export default function ErrorAlert({ message }: ErrorAlertProps) {
	return (
		<div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background px-5 py-4">
			<span className="size-2.5 rounded-full bg-[#F4B183]" />
			<p className="min-w-0 flex-1 basis-[320px] text-sm">{message}</p>
		</div>
	);
}
