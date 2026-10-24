export default function AccountLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-6 p-6 md:p-8">
			{children}
		</div>
	);
}
