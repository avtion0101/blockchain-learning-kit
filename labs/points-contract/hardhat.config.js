import { defineConfig } from "hardhat/config";
import { fileURLToPath } from "node:url";

const localSolc = fileURLToPath(
  new URL("./node_modules/solc/soljson.js", import.meta.url),
);

export default defineConfig({
  solidity: {
    version: "0.8.34",
    path: localSolc,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
});
