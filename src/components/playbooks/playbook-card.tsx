"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, DollarSign, Shield, Zap } from "lucide-react";
import { ImpactType, ToolSource } from "@prisma/client";
import Image from "next/image";
import { SOURCE_ICONS } from "@/lib/utils";

interface PlaybookCardProps {
	title: string;
	description: string;
	impact: string;
	impactType: ImpactType;
	source: ToolSource;
	itemsCount: number;
	onAction?: () => void;
}

const IMPACT_CONFIG = {
	security: {
		color: "bg-destructive/10 text-destructive",
		icon: Shield,
	},
	savings: {
		color: "bg-lime text-ink",
		icon: DollarSign,
	},
	efficiency: {
		color: "bg-muted text-muted-foreground",
		icon: Zap,
	},
};

export function PlaybookCard({
	title,
	description,
	impact,
	impactType,
	source,
	itemsCount,
	onAction,
}: PlaybookCardProps) {
	const impactKey = impactType?.toLowerCase() as keyof typeof IMPACT_CONFIG;
	const config =
		impactKey && IMPACT_CONFIG[impactKey]
			? IMPACT_CONFIG[impactKey]
			: IMPACT_CONFIG.savings; // default fallback

	const Icon = config.icon;

	return (
		<Card className="p-6">
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-start gap-3 flex-1">
					<div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xl flex-shrink-0">
						<Image
							src={SOURCE_ICONS[source as ToolSource]}
							alt={`${source} icon`}
							width={20}
							height={20}
						/>
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold text-base mb-1 text-foreground">
							{title}
						</h3>
						<p className="text-sm text-muted-foreground line-clamp-2">
							{description}
						</p>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between mt-4">
				<div className="flex items-center gap-3">
					<Badge
						variant="secondary"
						className={`${config.color} flex items-center gap-1 px-2 py-1`}
					>
						<Icon className="h-3 w-3" />
						{impact}
					</Badge>
					<span className="text-xs text-muted-foreground">
						{itemsCount} {itemsCount === 1 ? "item" : "items"}
					</span>
				</div>

				<Button
					variant="ghost"
					size="sm"
					onClick={onAction}
					className="gap-1"
				>
					Review
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</Card>
	);
}
