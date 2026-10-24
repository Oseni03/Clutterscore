import React from "react";
import {
	Html,
	Head,
	Body,
	Container,
	Section,
	Text,
	Heading,
	Button,
	Hr,
} from "@react-email/components";

interface MagicLinkEmailProps {
	email?: string;
	magicLink?: string;
}

const MagicLinkEmail = ({ email, magicLink }: MagicLinkEmailProps) => {
	return (
		<Html>
			<Head />
			<Body style={main}>
				<Container style={container}>
					{/* Header */}
					<Section style={header}>
						<Heading style={h1}>Sign in to Your Account</Heading>
						<Text style={subtitle}>
							Click the button below to securely sign in
						</Text>
					</Section>

					<Hr style={hr} />

					{/* Main Content */}
					<Section style={content}>
						<Text style={paragraph}>Hi there,</Text>

						<Text style={paragraph}>
							You requested a magic link to sign in to your
							account. Click the button below to continue:
						</Text>

						{/* Magic Link Button */}
						<Section style={buttonContainer}>
							<Button style={button} href={magicLink}>
								Sign In
							</Button>
						</Section>

						<Text style={paragraphGray}>
							This link will expire in 15 minutes for security
							reasons.
						</Text>

						<Text style={paragraphGray}>
							If the button doesn&rsquo;t work, copy and paste
							this link into your browser:
						</Text>

						<Text style={linkText}>{magicLink}</Text>
					</Section>

					<Hr style={hr} />

					{/* Footer */}
					<Section style={footer}>
						<Text style={footerText}>
							This email was sent to {email}
						</Text>
						<Text style={footerText}>
							If you didn&rsquo;t request this link, you can
							safely ignore this email.
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

// Styles
const main = {
	backgroundColor: "#FFFFFF",
	fontFamily:
		'Inter,"Inter Tight",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif',
};

const container = {
	margin: "0 auto",
	padding: "20px 0 48px",
	maxWidth: "560px",
};

const header = {
	textAlign: "center" as const,
	marginBottom: "32px",
};

const h1 = {
	color: "#0E0E0E",
	fontSize: "32px",
	fontWeight: "600",
	margin: "0 0 8px",
	padding: "0",
};

const subtitle = {
	color: "#5F5F5A",
	fontSize: "16px",
	margin: "0",
	padding: "0",
};

const content = {
	margin: "32px 0",
};

const paragraph = {
	color: "#0E0E0E",
	fontSize: "16px",
	lineHeight: "24px",
	margin: "0 0 16px",
};

const paragraphGray = {
	color: "#5F5F5A",
	fontSize: "14px",
	lineHeight: "20px",
	margin: "0 0 12px",
};

const buttonContainer = {
	textAlign: "center" as const,
	margin: "32px 0",
};

const button = {
	backgroundColor: "#0E0E0E",
	borderRadius: "999px",
	color: "#FFFFFF",
	fontSize: "16px",
	fontWeight: "600",
	textDecoration: "none",
	textAlign: "center" as const,
	display: "inline-block",
	padding: "14px 40px",
};

const linkText = {
	color: "#5F5F5A",
	fontSize: "12px",
	lineHeight: "18px",
	margin: "0 0 16px",
	wordBreak: "break-all" as const,
	backgroundColor: "#F4F4F2",
	padding: "12px",
	borderRadius: "12px",
};

const hr = {
	borderColor: "#E4E4DF",
	margin: "20px 0",
};

const footer = {
	textAlign: "center" as const,
	margin: "32px 0 0",
};

const footerText = {
	color: "#5F5F5A",
	fontSize: "14px",
	lineHeight: "20px",
	margin: "0 0 8px",
};

export default MagicLinkEmail;
