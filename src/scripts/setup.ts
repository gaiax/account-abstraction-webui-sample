import { ethers } from "hardhat";
import {
  SampleToken__factory,
  SampleNFT__factory,
  SamplePaymaster__factory,
} from "@/typechain-types";

import prompts, { PromptObject } from "prompts";
import {
  EntryPoint__factory,
  SimpleAccountFactory__factory,
} from "@account-abstraction/contracts";
import { DeterministicDeployer } from "@account-abstraction/sdk";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const dep = new DeterministicDeployer(ethers.provider);

  // Deploy the entrypoint contract
  const epAddr = DeterministicDeployer.getAddress(EntryPoint__factory.bytecode);
  if (await dep.isContractDeployed(epAddr)) {
    console.log("EntryPoint already deployed at", epAddr);
  } else {
    await dep.deterministicDeploy(EntryPoint__factory.bytecode);
    console.log("Entrypoint contract deployed at:", epAddr);
  }

  // Deploy the factory contract
  const Factory = new SimpleAccountFactory__factory();
  const factory = await Factory.connect(deployer).deploy(epAddr);
  await factory.deployed();

  console.log("Factory contract deployed at:", factory.address);

  const SampleToken = new SampleToken__factory();
  const SampleNFT = new SampleNFT__factory();
  const SamplePaymaster = new SamplePaymaster__factory();

  console.log("Deploying the sample ERC20 contract...");
  const erc20 = await SampleToken.connect(deployer).deploy("1000000000");
  await erc20.deployed();
  console.log("ERC20 contract deployed at:", erc20.address);

  console.log("Deploying the sample NFT contract...");
  const nft = await SampleNFT.connect(deployer).deploy();
  await nft.deployed();
  console.log("NFT contract deployed at:", nft.address);

  console.log("Deploying the sample Paymaster contract...");
  const paymaster = await SamplePaymaster.connect(deployer).deploy(epAddr);
  await paymaster.deployed();
  console.log("Paymaster contract deployed at:", paymaster.address);

  console.log("Sample ERC20 contract address:", erc20.address);
  console.log("Sample NFT contract address:", nft.address);
  console.log("Sample Paymaster contract address:", paymaster.address);

  console.log("Staking 3 tokens for 7 days to paymaster...");
  const tx = await paymaster.addStake(60 * 60 * 24 * 90, {
    value: ethers.utils.parseEther("3"),
  });
  await tx.wait();

  console.log("Done!");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
