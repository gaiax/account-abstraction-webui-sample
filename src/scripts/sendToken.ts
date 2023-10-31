import { ethers } from "hardhat";
import { SampleToken__factory, SampleNFT__factory } from "@/typechain-types";

import prompts, { PromptObject } from "prompts";

async function main() {
  const questions: PromptObject[] = [
    {
      type: "text",
      name: "tokenAddress",
      message: "Token address: ",
      validate: (value: string) =>
        ethers.utils.isAddress(value) || "Invalid token address",
    },
    {
      type: "text",
      name: "nftAddress",
      message: "NFT address: ",
      validate: (value: string) =>
        ethers.utils.isAddress(value) || "Invalid NFT address",
    },
    {
      type: "text",
      name: "recipient",
      message: "Recipient address: ",
      validate: (value: string) =>
        ethers.utils.isAddress(value) || "Invalid recipient address",
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
    10n * 10n ** BigInt(decimals)
  );
  const reciept1 = await tx.wait();

  const tx2 = await nft.safeMint(response.recipient);
  const reciept2 = await tx2.wait();

  console.log("Done");
  console.log("ERC20 token reciept:", reciept1.transactionHash);
  console.log("NFT reciept:", reciept2.transactionHash);

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
