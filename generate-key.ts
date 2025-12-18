#!/usr/bin/env tsx

/**
 * Generate a secure 32-byte encryption key for AES-256
 * Run: npx tsx generate-key.ts
 */

import { randomBytes } from "crypto";

const key = randomBytes(32).toString("hex");

console.log("=".repeat(60));
console.log("Generated Encryption Key (AES-256)");
console.log("=".repeat(60));
console.log("\nAdd this to your .env file:");
console.log("\nENCRYPTION_KEY=" + key);
console.log("\n" + "=".repeat(60));
console.log("\n⚠️  Keep this key SECRET and NEVER commit it to git!");
console.log("⚠️  Store it securely in your environment variables.");
console.log("\n" + "=".repeat(60));
