import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto";
import { networkInterfaces, hostname } from "os";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getMachineKey(): Buffer {
  const nets = networkInterfaces();
  const macs: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.mac && net.mac !== "00:00:00:00:00:00") {
        macs.push(net.mac);
      }
    }
  }
  const seed = `${hostname()}-${macs.sort().join("-")}`;
  return createHash("sha256").update(seed).digest();
}

export function encrypt(plaintext: string): string {
  const key = getMachineKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const key = getMachineKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted data format");
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}