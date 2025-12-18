import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { OrganizationStoreProvider } from "@/zustand/providers/organization-store-provider";
import {
	APP_DESCRIPTION,
	APP_ICON_IMAGE,
	APP_NAME,
	APP_URL,
} from "@/lib/config";
import { NotificationStoreProvider } from "@/zustand/providers/notifications-store-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

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
		default: `${APP_NAME} - Digital Workspace Hygiene Platform`,
		template: `%s | ${APP_NAME}`,
	},
	description: APP_DESCRIPTION,
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
	creator: APP_NAME,
	// openGraph: {
	// 	type: "website",
	// 	locale: "en_US",
	// 	url:
	// 		process.env.NEXT_PUBLIC_BASE_URL ||
	// 		"https://clutterscore.vercel.app",
	// 	siteName: "ClutterScore",
	// 	title: "ClutterScore - Digital Workspace Hygiene Platform",
	// 	description:
	// 		"Audit your workspace in 90 seconds. Identify waste, security risks, and optimization opportunities across your entire digital ecosystem.",
	// 	images: [
	// 		{
	// 			url: "/og-image.png",
	// 			width: 1200,
	// 			height: 630,
	// 			alt: "ClutterScore - Digital Workspace Hygiene Platform",
	// 		},
	// 	],
	// },
	// twitter: {
	// 	card: "summary_large_image",
	// 	title: "ClutterScore - Digital Workspace Hygiene Platform",
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
				url: APP_ICON_IMAGE,
				type: "image/png",
				sizes: "32x32",
			},
		],
		apple: [
			{
				url: APP_ICON_IMAGE,
				sizes: "180x180",
				type: "image/png",
			},
		],
	},
	// manifest: "/site.webmanifest",
	alternates: {
		canonical: APP_URL,
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
					<TooltipProvider>
						<OrganizationStoreProvider>
							<NotificationStoreProvider>
								{children}
							</NotificationStoreProvider>
						</OrganizationStoreProvider>
						<Toaster />
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
