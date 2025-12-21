export default function NoFilteredMessage() {
	return (
		<div className="col-span-2">
			<div className="text-center py-12 md:py-20 text-muted-foreground">
				<div className="text-3xl md:text-4xl mb-4">🔍</div>
				<h3 className="text-base md:text-lg font-medium mb-2">
					No playbooks found
				</h3>
				<p className="text-sm">
					Try adjusting your filters or search criteria.
				</p>
			</div>
		</div>
	);
}
