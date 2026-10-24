import Header from "@/components/homepage/header";
import Hero from "@/components/homepage/hero";
import HowItWorks from "@/components/homepage/how-it-works";
import AuditedBand from "@/components/homepage/audited-band";
import Integrations from "@/components/homepage/integrations";
import PlaybookReview from "@/components/homepage/playbook-review";
import Safety from "@/components/homepage/safety";
import Workspaces from "@/components/homepage/workspaces";
import Pricing from "@/components/homepage/pricing";
import CTA from "@/components/homepage/CTA";
import Footer from "@/components/homepage/footer";

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-background font-sans selection:bg-lime selection:text-ink">
			<Header />
			<main>
				<Hero />
				<HowItWorks />
				<AuditedBand />
				<Integrations />
				<PlaybookReview />
				<Safety />
				<Workspaces />
				<Pricing />
				<CTA />
			</main>
			<Footer />
		</div>
	);
}
