import test from "node:test";
import assert from "node:assert/strict";
import {
  createDemoKeyPair,
  runCryptoDemo,
  sha256,
  signMessage,
  verifyMessage,
} from "./crypto-demo.mjs";

test("相同消息生成相同 SHA-256，微小修改会改变结果", () => {
  assert.equal(sha256("hello"), sha256("hello"));
  assert.notEqual(sha256("hello"), sha256("Hello"));
});

test("签名只验证原消息", () => {
  const { privateKey, publicKey } = createDemoKeyPair();
  const signature = signMessage("pay Bob 10", privateKey);
  assert.equal(verifyMessage("pay Bob 10", signature, publicKey), true);
  assert.equal(verifyMessage("pay Bob 100", signature, publicKey), false);
});

test("演示结果同时表现哈希雪崩与签名授权", () => {
  const result = runCryptoDemo();
  assert.notEqual(result.originalHash, result.changedHash);
  assert.equal(result.originalSignatureValid, true);
  assert.equal(result.changedMessageValid, false);
});

