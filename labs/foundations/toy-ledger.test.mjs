import test from "node:test";
import assert from "node:assert/strict";
import {
  appendBlock,
  applyUtxoTransaction,
  blockHash,
  createChain,
  createUtxoSet,
  validateChain,
} from "./toy-ledger.mjs";

test("未修改的链通过验证", () => {
  const chain = createChain();
  appendBlock(chain, [{ from: "Alice", to: "Bob", amount: 10 }]);
  assert.equal(validateChain(chain).valid, true);
});

test("修改历史交易后哈希验证失败", () => {
  const chain = createChain();
  appendBlock(chain, [{ from: "Alice", to: "Bob", amount: 10 }]);
  chain[1].transactions[0].amount = 1000;
  assert.equal(validateChain(chain).valid, false);
});

test("修改前块并重新计算其哈希仍会破坏后续引用", () => {
  const chain = createChain();
  appendBlock(chain, [{ sequence: 1 }]);
  appendBlock(chain, [{ sequence: 2 }]);
  chain[1].transactions[0].sequence = 999;
  const originalHash = chain[1].hash;
  chain[1].hash = blockHash(chain[1]);
  assert.notEqual(chain[1].hash, originalHash);
  const validation = validateChain(chain);
  assert.equal(validation.valid, false);
  assert.match(validation.reason, /没有正确引用前块/);
});

test("UTXO 一旦花费就不能再次花费", () => {
  const utxos = createUtxoSet([{ id: "coin:0", owner: "Alice", amount: 10 }]);
  const transaction = {
    sender: "Alice",
    inputs: ["coin:0"],
    outputs: [{ owner: "Bob", amount: 9 }],
  };
  const result = applyUtxoTransaction(utxos, transaction);
  assert.equal(result.fee, 1);
  assert.throws(
    () => applyUtxoTransaction(utxos, transaction),
    /不存在或已经花费/,
  );
});

test("不能花费他人的 UTXO，也不能凭空增加输出", () => {
  const utxos = createUtxoSet([{ id: "coin:0", owner: "Alice", amount: 10 }]);
  assert.throws(
    () => applyUtxoTransaction(utxos, {
      sender: "Mallory",
      inputs: ["coin:0"],
      outputs: [{ owner: "Mallory", amount: 10 }],
    }),
    /无权花费/,
  );
  assert.throws(
    () => applyUtxoTransaction(utxos, {
      sender: "Alice",
      inputs: ["coin:0"],
      outputs: [{ owner: "Alice", amount: 11 }],
    }),
    /不能超过/,
  );
});
