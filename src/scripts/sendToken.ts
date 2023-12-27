import { ethers } from "hardhat";
import { SampleToken__factory, SampleNFT__factory } from "@/typechain-types";

import prompts, { PromptObject } from "prompts";

async function main() {
  const questions: PromptObject[] = [
    {
      type: "text",
      name: "tokenAddress",
      message: "ERC20 contract address: ",
      validate: (value: string) =>
        ethers.utils.isAddress(value) || "Invalid address",
    },
    {
      type: "text",
      name: "nftAddress",
      message: "ERC721 contract address: ",
      validate: (value: string) =>
        ethers.utils.isAddress(value) || "Invalid address",
    },
    {
      type: "text",
      name: "recipient",
      message: "Recipient address: ",
      validate: (value: string) =>
        ethers.utils.isAddress(value) || "Invalid address",
    },
    {
      type: "number",
      name: "amountMultiplier",
      message: "Amount multiplier: ",
      validate: (value: number) => {
        if (value < 0) return "Amount multiplier must be positive";
        if (!Number.isInteger(value))
          return "Amount multiplier must be integer";
        return true;
      },
    },
  ];

  const response = await prompts(questions, {
    onCancel: () => {
      console.error("User cancelled");
      process.exit(1);
    },
  });
  if (!response) {
    console.error("Invalid response");
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();

  const erc20 = SampleToken__factory.connect(response.tokenAddress, signer);
  const decimals = await erc20.decimals();
  const nft = SampleNFT__factory.connect(response.nftAddress, signer);

  const tx = await erc20.mint(
    response.recipient,
    10n * 10n ** BigInt(decimals) * BigInt(response.amountMultiplier)
  );
  const reciept1 = await tx.wait();

  let reciept2 = [];
  for (let i = 0; i < response.amountMultiplier; i++) {
    const tx = await nft.safeMint(response.recipient);
    reciept2.push(await tx.wait());
  }

  console.log("Done");
  console.log("ERC20 token reciept:", reciept1.transactionHash);
  console.log(
    "NFT reciept:",
    reciept2.map((r) => r.transactionHash)
  );
  console.log("");

  const balance = await erc20.balanceOf(response.recipient);
  console.log("ERC20 token balance of recipient:", balance.toString());

  const receivedNFTs = await nft.queryFilter(
    nft.filters.Transfer(null, response.recipient)
  );

  const ownedNFTs = receivedNFTs
    .filter(async (log) => {
      const tID = log.args.tokenId;
      const tOwner = await nft.ownerOf(tID);
      return tOwner === response.recipient;
    })
    .map((log) => log.args.tokenId.toBigInt());

  console.log("NFTs owned by recipient:", ownedNFTs);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
