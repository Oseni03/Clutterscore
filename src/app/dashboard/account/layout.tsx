export default function AccountLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mx-auto w-full max-w-[800px] space-y-6 p-6 md:p-8">
			{children}
		</div>
	);
}
