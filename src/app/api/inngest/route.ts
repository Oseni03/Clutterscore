import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
	automatedPlaybookExecution,
	runAuditJob,
	syncIntegrationsJob,
	executePlaybookJob,
} from "@/inngest/functions";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		/* your functions will be passed here later! */
		automatedPlaybookExecution,
		runAuditJob,
		syncIntegrationsJob,
		executePlaybookJob,
	],
});
