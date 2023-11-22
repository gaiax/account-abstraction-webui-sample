import { SamplePaymaster__factory } from "@/typechain-types";
import { EntryPoint__factory } from "@account-abstraction/contracts";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

describe("SamplePaymaster", () => {
  const deployedFixture = async () => {
    const [deployer] = await ethers.getSigners();

    const EntryPoint = new EntryPoint__factory().connect(deployer);
    const entryPoint = await EntryPoint.deploy();
    await entryPoint.deployed();

    const SamplePaymaster = new SamplePaymaster__factory().connect(deployer);
    const samplePaymaster = await SamplePaymaster.deploy(entryPoint.address);
    await samplePaymaster.deployed();

    return {
      entryPoint,
      samplePaymaster,
      deployer,
    };
  };
  it("should be deployed successfully", async () => {
    const { samplePaymaster } = await deployedFixture();

    expect(samplePaymaster.address).to.not.be.undefined;
  });

  it("should have the correct entry point", async () => {
    const { samplePaymaster, entryPoint } = await deployedFixture();

    expect(await samplePaymaster.entryPoint()).to.be.equal(entryPoint.address);
  });

  it("should have the correct owner", async () => {
    const { samplePaymaster, deployer } = await deployedFixture();

    expect(await samplePaymaster.owner()).to.be.equal(deployer.address);
  });

  describe("depositTo()", async () => {});

  describe("postOp()", async () => {
    const postOpFixture = async () => {
      const { entryPoint, samplePaymaster, deployer } = await deployedFixture();
      const [, sender, recipient] = await ethers.getSigners();

      await samplePaymaster.depositTo(sender.address, 0, {
        value: ethers.utils.parseEther("5000"),
      });

      return {
        entryPoint,
        samplePaymaster,
        deployer,
        sender,
        recipient,
      };
    };

    it("should change the balances correctly", async () => {
      const { samplePaymaster, sender } = await postOpFixture();
      const actualGasCost = ethers.utils.parseEther("1").toBigInt();

      const senderBalanceBefore = await samplePaymaster.balanceOf(
        sender.address
      );

      const COST_OF_POST_OP = (
        await samplePaymaster.COST_OF_POST_OP()
      ).toBigInt();
      const gasPrice = await ethers.provider.getGasPrice();
      console.log("gasPrice", gasPrice.toString());

      const tx = await samplePaymaster.postOp(
        1,
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [sender.address, gasPrice]
        ),
        actualGasCost
      );

      await tx.wait();
      expect(tx).to.not.be.reverted;

      const senderBalanceAfter = await samplePaymaster.balanceOf(
        sender.address
      );

      expect(senderBalanceAfter.toBigInt()).to.be.equal(
        senderBalanceBefore.toBigInt() -
          actualGasCost -
          COST_OF_POST_OP * gasPrice.toBigInt()
      );
    });
  });
});
