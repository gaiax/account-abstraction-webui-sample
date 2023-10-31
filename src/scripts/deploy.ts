import { ethers } from "hardhat";
import { SampleToken__factory, SampleNFT__factory } from "@/typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const SampleToken = new SampleToken__factory();
  const SampleNFT = new SampleNFT__factory();

  const erc20 = await SampleToken.connect(deployer).deploy("1000000000");
  const nft = await SampleNFT.connect(deployer).deploy();

  await erc20.deployed();
  await nft.deployed();

  console.log("Sample ERC20 contract address:", erc20.address);
  console.log("Sample NFT contract address:", nft.address);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
