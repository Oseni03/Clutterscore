import { PlaybookCard } from "@/components/playbooks/playbook-card";
import { Playbook } from "@prisma/client"; // Assuming type import

interface PlaybooksGridProps {
	playbooks: Playbook[];
	onPlaybookClick: (id: string) => void;
}

export default function PlaybooksGrid({
	playbooks,
	onPlaybookClick,
}: PlaybooksGridProps) {
	return (
		<div className="grid lg:grid-cols-2 gap-4 md:gap-6 mt-6">
			{playbooks.map((playbook) => (
				<PlaybookCard
					key={playbook.id}
					title={playbook.title}
					description={playbook.description}
					impact={playbook.impact}
					impactType={playbook.impactType}
					source={playbook.source}
					itemsCount={playbook.itemsCount}
					onAction={() => onPlaybookClick(playbook.id)}
				/>
			))}
		</div>
	);
}
