import { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-full">
			<main>{children}</main>
		</div>
	);
}
