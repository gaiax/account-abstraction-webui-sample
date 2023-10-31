import { HardhatUserConfig } from "hardhat/types";

import "@nomicfoundation/hardhat-network-helpers";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "tsconfig-paths/register";

const config: HardhatUserConfig = {
  solidity: "0.8.21",
  paths: {
    artifacts: "./dist/artifacts",
    cache: "./dist/cache",
    sources: "./src/contracts",
    tests: "./src/test",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
  },
};

export default config;
