import SimpleCrypto from "simple-crypto-js";

const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY!;
if (!ENCRYPTION_KEY) throw new Error("INTEGRATION_ENCRYPTION_KEY is required");

const cipher = new SimpleCrypto(Buffer.from(ENCRYPTION_KEY, "base64"));

export async function encrypt(
	value: string | null | undefined
): Promise<string | null> {
	if (!value) return null;
	const encrypted = await cipher.encrypt(value);
	return encrypted;
}

export async function decrypt(
	encrypted: string | null | undefined
): Promise<string | null> {
	if (!encrypted) return null;
	const plaintext = await cipher.decrypt(encrypted);
	return plaintext.toString();
}
