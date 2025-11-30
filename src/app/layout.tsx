import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { OrganizationStoreProvider } from "@/zustand/providers/organization-store-provider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "ClusterScore - Digital Workspace Hygiene Platform",
		template: "%s | ClusterScore",
	},
	description:
		"Audit, optimize, and secure your digital workspace in minutes. ClutterScore identifies waste, security risks, and inefficiencies across Slack, Google Drive, Microsoft 365, and more.",
	keywords: [
		"workspace audit",
		"digital hygiene",
		"SaaS optimization",
		"security audit",
		"workspace cleanup",
		"cost savings",
		"license management",
		"file management",
		"Slack audit",
		"Google Drive audit",
		"Microsoft 365 audit",
	],
	authors: [{ name: "ClutterScore" }],
	creator: "ClusterScore",
	// openGraph: {
	// 	type: "website",
	// 	locale: "en_US",
	// 	url:
	// 		process.env.NEXT_PUBLIC_BASE_URL ||
	// 		"https://clusterscore.vercel.app",
	// 	siteName: "ClusterScore",
	// 	title: "ClusterScore - Digital Workspace Hygiene Platform",
	// 	description:
	// 		"Audit your workspace in 90 seconds. Identify waste, security risks, and optimization opportunities across your entire digital ecosystem.",
	// 	images: [
	// 		{
	// 			url: "/og-image.png",
	// 			width: 1200,
	// 			height: 630,
	// 			alt: "ClusterScore - Digital Workspace Hygiene Platform",
	// 		},
	// 	],
	// },
	// twitter: {
	// 	card: "summary_large_image",
	// 	title: "ClusterScore - Digital Workspace Hygiene Platform",
	// 	description:
	// 		"Audit your workspace in 90 seconds. Find waste, risks, and savings opportunities.",
	// 	images: ["/og-image.png"],
	// 	creator: "@Oseni03",
	// },
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	icons: {
		icon: [
			{ url: "/favicon.ico" },
			{
				url: "/generated_images/logo.png",
				type: "image/png",
				sizes: "32x32",
			},
		],
		apple: [
			{
				url: "/generated_images/logo.png",
				sizes: "180x180",
				type: "image/png",
			},
		],
	},
	// manifest: "/site.webmanifest",
	alternates: {
		canonical: "https://clusterscore.vercel.app",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<ThemeProvider>
					<OrganizationStoreProvider>
						{children}
					</OrganizationStoreProvider>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
