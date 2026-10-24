"use client";

import React, { useState } from "react";
import Image from "next/image";

type LogoProps = {
	className?: string;
	alt?: string;
};

export const Logo: React.FC<LogoProps> = ({
	className = "w-8 h-8",
	alt = "Builders' Stack",
}) => {
	const [useFallback, setUseFallback] = useState(false);

	return (
		<>
			{!useFallback ? (
				<Image
					src="/generated_images/logo.png"
					alt={alt}
					width={64}
					height={64}
					className={className}
					onError={() => setUseFallback(true)}
				/>
			) : (
				<svg
					viewBox="0 0 64 64"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className={className}
					role="img"
					aria-label={alt}
				>
					<rect
						x="2"
						y="34"
						width="60"
						height="12"
						rx="6"
						fill="#0E0E0E"
					/>
					<rect
						x="2"
						y="48"
						width="60"
						height="12"
						rx="6"
						fill="#DDF35B"
					/>
					<rect
						x="34"
						y="2"
						width="12"
						height="60"
						rx="6"
						fill="#DDF35B"
					/>
					<rect
						x="14"
						y="18"
						width="20"
						height="12"
						rx="6"
						fill="#E4E4DF"
					/>
				</svg>
			)}
		</>
	);
};

export default Logo;
