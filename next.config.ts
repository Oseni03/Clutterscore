import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	// allowedDevOrigins: ["local-origin.dev", "*.local-origin.dev"],
	webpack: (config, { isServer }) => {
		// Only apply on server-side bundles (API routes, server components, etc.)

		if (!isServer) return config;

		config.resolve.fallback = {
			...config.resolve.fallback,
			encoding: require.resolve("encoding"), // ← forces the real package
		};

		return config;
	},

	// Optional but recommended for Vercel edge functions / middleware
	// (if you ever use the SDK there, otherwise not needed)
	experimental: {
		// serverComponentsExternalPackages: ["@linear/sdk"], // uncomment only if using in RSC
	},
};

export default nextConfig;
