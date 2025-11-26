"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function StorageChart({
	storageData,
}: {
	storageData: { name: string; value: number; color: string }[];
}) {
	return (
		<ResponsiveContainer width="100%" height="100%">
			<PieChart>
				<Pie
					data={storageData}
					cx="50%"
					cy="50%"
					innerRadius={60}
					outerRadius={80}
					paddingAngle={5}
					dataKey="value"
				>
					{storageData.map((entry, index) => (
						<Cell key={`cell-${index}`} fill={entry.color} />
					))}
				</Pie>

				<Tooltip
					contentStyle={{
						backgroundColor: "hsl(var(--card))",
						borderRadius: "8px",
						border: "1px solid hsl(var(--border))",
					}}
					labelStyle={{
						color: "hsl(var(--muted-foreground))",
					}}
					itemStyle={{
						color: "hsl(var(--foreground))",
					}}
				/>
			</PieChart>
		</ResponsiveContainer>
	);
}
