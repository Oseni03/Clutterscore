const workspaceItems = [
	"Integrations",
	"Audits",
	"Playbooks",
	"Audit logs",
	"Billing",
	"Members",
];

function Workspaces() {
	return (
		<section className="mx-auto max-w-[1200px] px-6 pt-28">
			<div className="flex flex-wrap items-stretch gap-8">
				<div className="flex-1 basis-[400px]">
					<h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-[48px]">
						One workspace per organization
					</h2>
					<p className="mt-3 max-w-[480px] text-muted-foreground">
						Each workspace keeps its own data, so teams and clients
						stay cleanly separated.
					</p>
				</div>
				<div className="flex flex-1 basis-[400px] flex-wrap content-center gap-2">
					{workspaceItems.map((item, index) => (
						<span
							key={item}
							className={
								index === 0
									? "rounded-sm bg-ink px-4 py-2.5 text-[14px] font-medium text-paper"
									: "rounded-sm bg-muted px-4 py-2.5 text-[14px] font-medium"
							}
						>
							{item}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}

export default Workspaces;
