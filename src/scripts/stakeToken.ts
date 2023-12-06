import { ethers } from "hardhat";
import { SamplePaymaster__factory } from "@/typechain-types";
import prompts, { PromptObject } from "prompts";

async function main() {
  const [sender] = await ethers.getSigners();
  console.log("Sending txs with account:", sender.address);

  const questions: PromptObject[] = [
    {
      type: "text",
      name: "paymasterAdress",
      message: "Enter paymaster address",
      validate: (value) =>
        ethers.utils.isAddress(value) ? true : "Invalid address",
    },
    {
      type: "number",
      name: "amount",
      message: "Enter amount to stake",
      validate: (value) => (value > 0 ? true : "Invalid amount"),
    },
  ];

  const { paymasterAdress, amount } = await prompts(questions);

  const paymaster = SamplePaymaster__factory.connect(paymasterAdress, sender);
  console.log(`Staking ${amount} tokens for 90 days to paymaster...`);
  const tx = await paymaster.addStake(60 * 60 * 24 * 90, {
    value: ethers.utils.parseEther(amount.toString()),
  });
  console.log("txid:", tx.hash);
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
