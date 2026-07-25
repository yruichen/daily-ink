import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export class SecretVault {
  private readonly key: Buffer;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    const keyPath = path.join(dataDir, "app.key");
    if (!fs.existsSync(keyPath)) {
      fs.writeFileSync(keyPath, randomBytes(32), { mode: 0o600 });
    }
    this.key = fs.readFileSync(keyPath);
    if (this.key.length !== 32)
      throw new Error("Invalid local encryption key.");
  }

  encrypt(value: string): string {
    if (!value) return "";
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [iv, authTag, encrypted]
      .map((part) => part.toString("base64url"))
      .join(".");
  }

  decrypt(value: string | null): string {
    if (!value) return "";
    const [ivText, authTagText, encryptedText] = value.split(".");
    if (!ivText || !authTagText || !encryptedText) {
      throw new Error("Invalid encrypted secret.");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(ivText, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authTagText, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
