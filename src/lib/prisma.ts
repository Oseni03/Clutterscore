/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "./crypto";
import { Prisma } from "@prisma/client";

const basePrisma = new PrismaClient();

const SECRET_FIELDS = ["accessToken", "refreshToken"] as const;
type SecretField = (typeof SECRET_FIELDS)[number];

// Helper: safely encrypt a value
const encryptIfPresent = async (
	data: any,
	field: SecretField
): Promise<void> => {
	if (field in data && data[field] !== undefined) {
		data[field] = await encrypt(data[field] ?? null);
	}
};

// Helper: safely decrypt a record
const decryptRecord = async (record: any): Promise<any> => {
	if (!record || typeof record !== "object") return record;

	const decrypted: Record<string, any> = { ...record };
	for (const field of SECRET_FIELDS) {
		if (field in record && record[field] !== null) {
			decrypted[field] = await decrypt(record[field] as string);
		}
	}
	return decrypted;
};

// Deep decrypt for nested structures (groupBy, aggregate)
const deepDecrypt = async (value: any): Promise<any> => {
	if (Array.isArray(value)) {
		return Promise.all(value.map(deepDecrypt));
	}
	if (value && typeof value === "object") {
		// Handle groupBy _count or aggregate fields
		if ("_count" in value && typeof value._count === "object") {
			return decryptRecord(value);
		}
		// Recurse into object
		const result: Record<string, any> = {};
		for (const [k, v] of Object.entries(value)) {
			result[k] = await deepDecrypt(v);
		}
		return result;
	}
	return value;
};

export const encryptedIntegrationExtension = Prisma.defineExtension({
	name: "EncryptedIntegration",
	query: {
		toolIntegration: {
			// ───── CREATE ─────
			async create({ args, query }) {
				for (const field of SECRET_FIELDS) {
					await encryptIfPresent(args.data, field);
				}
				return query(args);
			},

			// ───── UPSERT ─────
			async upsert({ args, query }) {
				for (const field of SECRET_FIELDS) {
					await encryptIfPresent(args.create, field);
					await encryptIfPresent(args.update, field);
				}
				return query(args);
			},

			// ───── UPDATE ─────
			async update({ args, query }) {
				for (const field of SECRET_FIELDS) {
					await encryptIfPresent(args.data, field);
				}
				return query(args);
			},

			// ───── UPDATE MANY ─────
			async updateMany({ args, query }) {
				for (const field of SECRET_FIELDS) {
					await encryptIfPresent(args.data, field);
				}
				return query(args);
			},

			// ───── ALL READ OPERATIONS ─────
			async $allOperations({ operation, args, query }) {
				const result = await query(args);

				const isReadOperation =
					operation.startsWith("find") ||
					operation === "aggregate" ||
					operation === "groupBy" ||
					operation === "count";

				if (!isReadOperation) return result;

				// count → { count: number }
				if (operation === "count") {
					return result;
				}

				// find* → single record or array
				if (operation.startsWith("find")) {
					if (Array.isArray(result)) {
						return Promise.all(result.map(decryptRecord));
					}
					return decryptRecord(result);
				}

				// aggregate → { _count, _avg, etc. }
				if (operation === "aggregate") {
					return deepDecrypt(result);
				}

				// groupBy → array of groups with _count, etc.
				if (operation === "groupBy") {
					if (Array.isArray(result)) {
						return Promise.all(result.map(decryptRecord));
					}
				}

				return result;
			},
		},
		account: {
			// ───── CREATE ─────
			async create({ args, query }) {
				for (const field of SECRET_FIELDS) {
					await encryptIfPresent(args.data, field);
				}
				return query(args);
			},

			// ───── UPSERT ─────
			async upsert({ args, query }) {
				for (const field of SECRET_FIELDS) {
					await encryptIfPresent(args.create, field);
					await encryptIfPresent(args.update, field);
				}
				return query(args);
			},

			// ───── UPDATE ─────
			async update({ args, query }) {
				for (const field of SECRET_FIELDS) {
					await encryptIfPresent(args.data, field);
				}
				return query(args);
			},

			// ───── UPDATE MANY ─────
			async updateMany({ args, query }) {
				for (const field of SECRET_FIELDS) {
					await encryptIfPresent(args.data, field);
				}
				return query(args);
			},

			// ───── ALL READ OPERATIONS ─────
			async $allOperations({ operation, args, query }) {
				const result = await query(args);

				const isReadOperation =
					operation.startsWith("find") ||
					operation === "aggregate" ||
					operation === "groupBy" ||
					operation === "count";

				if (!isReadOperation) return result;

				// count → { count: number }
				if (operation === "count") {
					return result;
				}

				// find* → single record or array
				if (operation.startsWith("find")) {
					if (Array.isArray(result)) {
						return Promise.all(result.map(decryptRecord));
					}
					return decryptRecord(result);
				}

				// aggregate → { _count, _avg, etc. }
				if (operation === "aggregate") {
					return deepDecrypt(result);
				}

				// groupBy → array of groups with _count, etc.
				if (operation === "groupBy") {
					if (Array.isArray(result)) {
						return Promise.all(result.map(decryptRecord));
					}
				}

				return result;
			},
		},
	},
});

// Apply extension
export const prisma = basePrisma.$extends(encryptedIntegrationExtension);
