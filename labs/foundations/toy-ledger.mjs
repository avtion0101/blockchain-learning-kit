import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function blockHash(block) {
  return digest({
    height: block.height,
    previousHash: block.previousHash,
    transactions: block.transactions,
    nonce: block.nonce,
  });
}

export function createChain() {
  const genesis = {
    height: 0,
    previousHash: "0".repeat(64),
    transactions: [{ type: "genesis", note: "教学链起点" }],
    nonce: 0,
  };
  return [{ ...genesis, hash: blockHash(genesis) }];
}

export function appendBlock(chain, transactions, nonce = 0) {
  const previous = chain.at(-1);
  const next = {
    height: previous.height + 1,
    previousHash: previous.hash,
    transactions,
    nonce,
  };
  const sealed = { ...next, hash: blockHash(next) };
  chain.push(sealed);
  return sealed;
}

export function validateChain(chain) {
  if (chain.length === 0) return { valid: false, reason: "链不能为空" };

  for (let index = 0; index < chain.length; index += 1) {
    const block = chain[index];
    if (block.hash !== blockHash(block)) {
      return { valid: false, reason: `第 ${index} 个区块内容与哈希不匹配` };
    }
    if (index > 0 && block.previousHash !== chain[index - 1].hash) {
      return { valid: false, reason: `第 ${index} 个区块没有正确引用前块` };
    }
  }
  return { valid: true, reason: "区块内容和引用关系一致" };
}

export function createUtxoSet(entries) {
  return new Map(entries.map((entry) => [entry.id, { ...entry }]));
}

export function applyUtxoTransaction(utxos, transaction) {
  const uniqueInputs = new Set(transaction.inputs);
  if (uniqueInputs.size !== transaction.inputs.length) {
    throw new Error("同一 UTXO 不能在一笔交易中使用两次");
  }

  const inputs = transaction.inputs.map((id) => {
    const input = utxos.get(id);
    if (!input) throw new Error(`输入 ${id} 不存在或已经花费`);
    if (input.owner !== transaction.sender) {
      throw new Error(`发送者无权花费输入 ${id}`);
    }
    return input;
  });

  if (!Array.isArray(transaction.outputs) || transaction.outputs.length === 0) {
    throw new Error("交易必须产生至少一个输出");
  }
  if (transaction.outputs.some((output) => output.amount <= 0)) {
    throw new Error("输出金额必须大于零");
  }

  const inputTotal = inputs.reduce((sum, input) => sum + input.amount, 0);
  const outputTotal = transaction.outputs.reduce((sum, output) => sum + output.amount, 0);
  if (outputTotal > inputTotal) throw new Error("输出总额不能超过输入总额");

  const txId = digest(transaction).slice(0, 16);
  for (const id of transaction.inputs) utxos.delete(id);
  transaction.outputs.forEach((output, index) => {
    utxos.set(`${txId}:${index}`, { id: `${txId}:${index}`, ...output });
  });

  return { txId, fee: inputTotal - outputTotal };
}

function printDemo() {
  const chain = createChain();
  appendBlock(chain, [{ from: "Alice", to: "Bob", amount: 10 }]);
  appendBlock(chain, [{ from: "Bob", to: "Chen", amount: 4 }]);
  console.log("原链验证：", validateChain(chain));

  const tampered = structuredClone(chain);
  tampered[1].transactions[0].amount = 1000;
  console.log("篡改交易后：", validateChain(tampered));

  const utxos = createUtxoSet([{ id: "genesis:0", owner: "Alice", amount: 10 }]);
  const spend = {
    sender: "Alice",
    inputs: ["genesis:0"],
    outputs: [
      { owner: "Bob", amount: 6 },
      { owner: "Alice", amount: 3 },
    ],
  };
  console.log("第一次花费：", applyUtxoTransaction(utxos, spend));
  console.log("当前 UTXO：", [...utxos.values()]);
  try {
    applyUtxoTransaction(utxos, spend);
  } catch (error) {
    console.log("再次花费同一输入：", error.message);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  printDemo();
}

