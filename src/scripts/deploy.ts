import { ethers } from "hardhat";
import {
  SampleToken__factory,
  SampleNFT__factory,
  SamplePaymaster__factory,
} from "@/typechain-types";

import prompts, { PromptObject } from "prompts";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const entrypointAns = await prompts({
    type: "text",
    name: "address",
    message: "Entrypoint address: ",
    validate: (value: string) =>
      ethers.utils.isAddress(value) || "Invalid entrypoint address",
  });

  if (!entrypointAns) {
    console.error("Invalid response");
    process.exit(1);
  }

  const SampleToken = new SampleToken__factory();
  const SampleNFT = new SampleNFT__factory();
  const SamplePaymaster = new SamplePaymaster__factory();

  const erc20 = await SampleToken.connect(deployer).deploy("1000000000");
  const nft = await SampleNFT.connect(deployer).deploy();
  const paymaster = await SamplePaymaster.connect(deployer).deploy(
    entrypointAns.address
  );

  await erc20.deployed();
  await nft.deployed();
  await paymaster.deployed();

  console.log("Sample ERC20 contract address:", erc20.address);
  console.log("Sample NFT contract address:", nft.address);
  console.log("Sample Paymaster contract address:", paymaster.address);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
