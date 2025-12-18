import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Algorithm: AES-256-GCM (fast and secure)
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * Falls back to a default key if not set (for development only)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.warn(
      "WARNING: ENCRYPTION_KEY not set in environment variables. Using default key (NOT SECURE FOR PRODUCTION)"
    );
    // Default key for development (32 bytes for AES-256)
    return Buffer.from("0123456789abcdef0123456789abcdef", "utf-8");
  }
  
  // Try to parse as hex first (most common format from key generation)
  if (key.length === 64 && /^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, "hex");
  }
  
  // Otherwise, treat as UTF-8 string
  const keyBuffer = Buffer.from(key, "utf-8");
  
  if (keyBuffer.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 bytes (256 bits) for AES-256. Got ${keyBuffer.length} bytes. Use a 64-character hex string or 32-byte UTF-8 string.`
    );
  }
  
  return keyBuffer;
}

/**
 * Encrypt text using AES-256-GCM
 * Returns: base64-encoded string in format: iv:authTag:encryptedData
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  
  const authTag = cipher.getAuthTag();
  
  // Combine iv, authTag, and encrypted data (all base64 encoded)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt text using AES-256-GCM
 * Input: base64-encoded string in format: iv:authTag:encryptedData
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  
  // Split the encrypted text into its components
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }
  
  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Encrypt message object - encrypts the text field
 */
export function encryptMessage(message: { text: string; [key: string]: any }) {
  return {
    ...message,
    text: encrypt(message.text),
  };
}

/**
 * Decrypt message object - decrypts the text field
 */
export function decryptMessage(message: { text: string; [key: string]: any }) {
  try {
    return {
      ...message,
      text: decrypt(message.text),
    };
  } catch (error) {
    console.error("Failed to decrypt message:", error);
    // Return message as-is if decryption fails (backward compatibility)
    return message;
  }
}
