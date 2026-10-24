import Link from "next/link";

const footerColumns = [
	{
		title: "Product",
		links: [
			{ label: "How it works", href: "#how" },
			{ label: "Playbooks", href: "#playbook" },
			{ label: "Pricing", href: "#pricing" },
		],
	},
	{
		title: "Integrations",
		links: [
			{ label: "Google", href: "#integrations" },
			{ label: "Slack", href: "#integrations" },
			{ label: "Dropbox", href: "#integrations" },
			{ label: "Notion", href: "#integrations" },
		],
	},
	{
		title: "Resources",
		links: [
			{ label: "Blog", href: "#how" },
			{ label: "Help center", href: "#safety" },
			{ label: "System status", href: "#integrations" },
		],
	},
	{
		title: "Company",
		links: [
			{ label: "About", href: "#top" },
			{ label: "Security", href: "#safety" },
			{ label: "Contact", href: "#start" },
		],
	},
];

function Footer() {
	return (
		<footer className="mx-auto max-w-[1200px] px-6 pb-10 pt-[72px]">
			<div className="flex flex-wrap justify-between gap-x-12 gap-y-10">
				<Link
					href="/"
					className="flex-1 basis-[200px] font-display text-2xl font-bold tracking-[-0.03em]"
				>
					Clutterscore
				</Link>
				<div className="flex flex-[3_1_560px] flex-wrap gap-x-12 gap-y-8 text-[14px]">
					{footerColumns.map((column) => (
						<div
							key={column.title}
							className="flex flex-1 basis-[120px] flex-col gap-2.5"
						>
							<span className="font-semibold">
								{column.title}
							</span>
							{column.links.map((link) => (
								<Link
									key={link.label}
									href={link.href}
									className="text-muted-foreground transition-opacity hover:opacity-70"
								>
									{link.label}
								</Link>
							))}
						</div>
					))}
				</div>
			</div>

			<div className="mt-12 flex flex-wrap justify-between gap-3 border-t border-border pt-5 text-[12px] text-muted-foreground">
				<span>Privacy · Terms · Cookies</span>
				<span>© 2026 Clutterscore</span>
			</div>
		</footer>
	);
}

export default Footer;
