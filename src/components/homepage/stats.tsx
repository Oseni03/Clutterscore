import React from "react";

function Stats() {
	return (
		<section className="py-24 bg-muted/30 border-y border-border/50">
			<div className="container mx-auto px-4">
				<div className="grid md:grid-cols-3 gap-12 text-center">
					<div>
						<h3 className="text-5xl font-display font-bold mb-2 text-primary">
							68%
						</h3>
						<p className="text-lg font-medium mb-2">
							of enterprise storage is dark data
						</p>
						<p className="text-sm text-muted-foreground">
							No one has touched it in years.
						</p>
					</div>
					<div>
						<h3 className="text-5xl font-display font-bold mb-2 text-primary">
							14mo
						</h3>
						<p className="text-lg font-medium mb-2">
							average ghost access retention
						</p>
						<p className="text-sm text-muted-foreground">
							Ex-employees still reading your docs.
						</p>
					</div>
					<div>
						<h3 className="text-5xl font-display font-bold mb-2 text-primary">
							28%
						</h3>
						<p className="text-lg font-medium mb-2">
							of time wasted searching
						</p>
						<p className="text-sm text-muted-foreground">
							{"Where was that file again?"}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

export default Stats;
