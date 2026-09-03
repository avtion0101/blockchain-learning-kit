import {
  createHash,
  createSign,
  createVerify,
  generateKeyPairSync,
} from "node:crypto";
import { pathToFileURL } from "node:url";

export function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function createDemoKeyPair() {
  return generateKeyPairSync("ec", { namedCurve: "secp256k1" });
}

export function signMessage(message, privateKey) {
  const signer = createSign("SHA256");
  signer.update(message, "utf8");
  signer.end();
  return signer.sign(privateKey);
}

export function verifyMessage(message, signature, publicKey) {
  const verifier = createVerify("SHA256");
  verifier.update(message, "utf8");
  verifier.end();
  return verifier.verify(publicKey, signature);
}

export function runCryptoDemo(message = "Alice pays Bob 10 units") {
  const changedMessage = `${message}.`;
  const { privateKey, publicKey } = createDemoKeyPair();
  const signature = signMessage(message, privateKey);

  return {
    message,
    changedMessage,
    originalHash: sha256(message),
    changedHash: sha256(changedMessage),
    originalSignatureValid: verifyMessage(message, signature, publicKey),
    changedMessageValid: verifyMessage(changedMessage, signature, publicKey),
    signatureHex: signature.toString("hex"),
  };
}

function printDemo() {
  const result = runCryptoDemo(process.argv.slice(2).join(" ") || undefined);
  console.log("原消息：", result.message);
  console.log("原哈希：", result.originalHash);
  console.log("改后消息：", result.changedMessage);
  console.log("改后哈希：", result.changedHash);
  console.log("原消息签名可验证：", result.originalSignatureValid);
  console.log("篡改后仍可通过原签名：", result.changedMessageValid);
  console.log("签名（十六进制）：", result.signatureHex);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  printDemo();
}

