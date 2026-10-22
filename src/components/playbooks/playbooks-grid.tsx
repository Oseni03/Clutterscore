import { PlaybookCard } from "@/components/playbooks/playbook-card";
import { Playbook } from "@prisma/client";

interface PlaybooksGridProps {
	playbooks: Playbook[];
	onPlaybookClick: (id: string) => void;
}

export default function PlaybooksGrid({
	playbooks,
	onPlaybookClick,
}: PlaybooksGridProps) {
	return (
		<div className="grid gap-5 lg:grid-cols-2">
			{playbooks.map((playbook) => (
				<PlaybookCard
					key={playbook.id}
					title={playbook.title}
					description={playbook.description}
					impactType={playbook.impactType}
					source={playbook.source}
					itemsCount={playbook.itemsCount}
					status={playbook.status}
					riskLevel={playbook.riskLevel}
					onAction={() => onPlaybookClick(playbook.id)}
				/>
			))}
		</div>
	);
}
