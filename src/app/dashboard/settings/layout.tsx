import { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto">{children}</main>
		</div>
	);
}
