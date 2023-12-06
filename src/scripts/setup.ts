import { ethers } from "hardhat";
import {
  SampleToken__factory,
  SampleNFT__factory,
  SamplePaymaster__factory,
  SamplePaymasterWithBaseFeeOp__factory,
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

  const answers = await prompts({
    type: "multiselect",
    name: "value",
    message: "Select contracts to be deployed",
    choices: [
      {
        title: "Simple account factory contracts",
        value: "SimpleAccountFactory",
      },
      { title: "Sample ERC-20 contracts", value: "SampleToken" },
      { title: "Sample ERC-721 contracts", value: "SampleNFT" },
      { title: "Sample paymaster contracts", value: "SamplePaymaster" },
    ],
  });

  const contractsToBeDeployed = answers.value as string[];

  // Deploy the factory contract
  if (!contractsToBeDeployed.includes("SimpleAccountFactory")) {
    console.log("SimpleAccountFactory not selected, skipping...");
  } else {
    console.log("Deploying the SimpleAccountFactory contract...");
    const Factory = new SimpleAccountFactory__factory();
    const factory = await Factory.connect(deployer).deploy(epAddr);
    await factory.deployed();
    console.log("SimpleAccountFactory deployed at:", factory.address);
  }

  // Deploy the sample contracts
  let finalResults: string[] = [];
  const SampleToken = new SampleToken__factory();
  const SampleNFT = new SampleNFT__factory();
  const SamplePaymaster = new SamplePaymaster__factory();
  // const SamplePaymaster = new SamplePaymasterWithBaseFeeOp__factory();

  if (!contractsToBeDeployed.includes("SampleToken")) {
    console.log("SampleToken not selected, skipping...");
  } else {
    console.log("Deploying the sample ERC20 contract...");
    const erc20 = await SampleToken.connect(deployer).deploy("1000000000");
    await erc20.deployed();
    finalResults.push("Sample ERC20 contract address: " + erc20.address);
    console.log("ERC20 contract deployed at:", erc20.address);
  }

  if (!contractsToBeDeployed.includes("SampleNFT")) {
    console.log("SampleNFT not selected, skipping...");
  } else {
    console.log("Deploying the sample NFT contract...");
    const nft = await SampleNFT.connect(deployer).deploy();
    await nft.deployed();
    finalResults.push("Sample NFT contract address: " + nft.address);
    console.log("NFT contract deployed at:", nft.address);
  }

  if (!contractsToBeDeployed.includes("SamplePaymaster")) {
    console.log("SamplePaymaster not selected, skipping...");
  } else {
    console.log("Deploying the sample Paymaster contract...");
    const paymaster = await SamplePaymaster.connect(deployer).deploy(epAddr);
    await paymaster.deployed();
    finalResults.push(
      "Sample Paymaster contract address: " + paymaster.address
    );
    console.log("Paymaster contract deployed at:", paymaster.address);

    const balance = await deployer.getBalance();
    if (balance.lt(ethers.utils.parseEther("3"))) {
      console.log(
        "Unable to stake 3 tokens for 90 days to paymaster, please send some tokens to",
        deployer.address
      );
    } else {
      console.log("Staking 3 tokens for 90 days to paymaster...");
      const tx = await paymaster.addStake(60 * 60 * 24 * 90, {
        value: ethers.utils.parseEther("3"),
      });
      await tx.wait();
    }
  }

  for (const result of finalResults) {
    console.log(result);
  }
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
