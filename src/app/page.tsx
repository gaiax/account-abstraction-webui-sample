"use client";

import Button from "@src/components/button";
import { css } from "@styles/css";
import { Container, Box } from "@styles/jsx";

import {
  SimpleAccountFactory__factory,
  SimpleAccount__factory,
  UserOperationStruct,
} from "@account-abstraction/contracts";
import {
  DeterministicDeployer,
  HttpRpcClient,
  SimpleAccountAPI,
} from "@account-abstraction/sdk";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ContractFactory, Wallet, ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { Bytes, serializeTransaction } from "ethers/lib/utils";
import { SampleNFT__factory, SampleToken__factory } from "@/typechain-types";

const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

export default function Home() {
  const wallet = useMemo(() => new Wallet("0x".padEnd(66, "7")), []);
  const provider = useMemo(
    () => new JsonRpcProvider("http://127.0.0.1:8545"),
    []
  );
  const bundlerProvider = useMemo(
    () =>
      new HttpRpcClient("http://127.0.0.1:3000/rpc", ENTRY_POINT_ADDRESS, 1337),
    []
  );

  const accountFactory = DeterministicDeployer.getAddress(
    new ContractFactory(
      SimpleAccountFactory__factory.abi,
      SimpleAccountFactory__factory.bytecode
    ),
    0,
    [ENTRY_POINT_ADDRESS]
  );

  const [counterFactualAddress, setCounterFactualAddress] = useState("");
  const [nonce, setNonce] = useState(0);
  const [accountApi, setAccountApi] = useState<SimpleAccountAPI | null>(null);

  const [erc20ContractAddress, setERC20ContractAddress] = useState("");
  const [erc20TokenSymbol, setERC20TokenSymbol] = useState("");
  const [nftContractAddress, setNFTContractAddress] = useState("");

  const [accountBalance, setAccountBalance] = useState(BigInt(0));
  const [accountDeployed, setAccountDeployed] = useState(false);
  const [accountERC20Balance, setAccountERC20Balance] = useState(BigInt(0));
  const [accountOwnedNFTs, setAccountOwnedNFTs] = useState<BigInt[]>([]);

  const [txTo, setTxTo] = useState("");
  const [txInputError, setTxInputError] = useState("");
  const [txValue, setTxValue] = useState(0);
  const [txStruct, setTxStruct] = useState<UserOperationStruct>();
  const [txType, setTxType] = useState<"ETH" | "ERC20" | "ERC721">("ETH");
  const [txFunctionCallData, setTxFunctionCallData] = useState<string | null>(
    null
  );
  const [isTxSending, setIsTxSending] = useState(false);

  useEffect(() => {
    const accountApi = new SimpleAccountAPI({
      provider,
      entryPointAddress: ENTRY_POINT_ADDRESS,
      factoryAddress: accountFactory,
      owner: wallet,
      index: nonce,
    });
    setAccountApi(accountApi);

    const getCounterFactualAddress = async () => {
      const addr = await accountApi.getCounterFactualAddress();
      setCounterFactualAddress(addr);
    };
    getCounterFactualAddress();
  }, [setAccountApi, nonce, provider, wallet, accountFactory]);

  useEffect(() => {
    const getBalance = async () => {
      if (counterFactualAddress) {
        const balance = await provider.getBalance(counterFactualAddress);
        setAccountBalance(balance.toBigInt());
      }
    };
    const checkIsAccountDeployed = async () => {
      if (counterFactualAddress) {
        const code = await provider.getCode(counterFactualAddress);
        setAccountDeployed(code !== "0x");
      }
    };

    getBalance();
    checkIsAccountDeployed();
  }, [counterFactualAddress, provider]);

  useEffect(() => {
    const getERC20Balance = async () => {
      if (counterFactualAddress && erc20ContractAddress) {
        const erc20 = SampleToken__factory.connect(
          erc20ContractAddress,
          provider
        );
        const decimals = await erc20.decimals();
        const symbol = await erc20.symbol();
        const balance = await erc20.balanceOf(counterFactualAddress);
        setAccountERC20Balance(balance.toBigInt() / 10n ** BigInt(decimals));
        setERC20TokenSymbol(symbol);
      }
    };

    const getNFTs = async () => {
      if (counterFactualAddress && nftContractAddress) {
        const nft = SampleNFT__factory.connect(nftContractAddress, provider);

        const receivedNFTs = await nft.queryFilter(
          nft.filters.Transfer(null, counterFactualAddress)
        );

        const receivedNFTsWithOwners = await Promise.all(
          receivedNFTs.map(async (log) => {
            const tID = log.args.tokenId;
            const tOwner = await nft.ownerOf(tID);
            return { log, owner: tOwner };
          })
        );

        const ownedNFTs = receivedNFTsWithOwners
          .filter(({ log, owner }) => {
            return owner.toLowerCase() === counterFactualAddress.toLowerCase();
          })
          .map(({ log }) => log.args.tokenId.toBigInt());

        setAccountOwnedNFTs(ownedNFTs);
      }
    };

    getERC20Balance().catch(console.error);
    getNFTs().catch(console.error);
  }, [
    counterFactualAddress,
    erc20ContractAddress,
    nftContractAddress,
    provider,
  ]);

  const decodeFunctionData = () => {
    if (txFunctionCallData == null) {
      return null;
    }

    if (txType == "ERC20") {
      const iface = SampleToken__factory.connect(
        erc20ContractAddress,
        provider
      ).interface;
      return (
        "transfer(" +
        iface.decodeFunctionData("transfer", txFunctionCallData).toString() +
        ")"
      );
    }

    if (txType == "ERC721") {
      const iface = SampleNFT__factory.connect(
        nftContractAddress,
        provider
      ).interface;
      return (
        "safeTransferFrom(" +
        iface
          .decodeFunctionData("safeTransferFrom", txFunctionCallData)
          .toString() +
        ")"
      );
    }

    return null;
  };

  return (
    <Container py={"6"} maxW={"800px"}>
      <Box mb={"3"}>
        <h1
          className={css({
            textAlign: "center",
            fontSize: "2rem",
            fontWeight: "bold",
          })}
        >
          Account Abstraction Demo
        </h1>
      </Box>
      <Box textAlign="center" mb={"3"}>
        <p
          className={css({
            fontWeight: "bold",
          })}
        >
          Account Factory: {accountFactory}
        </p>
      </Box>
      <Box textAlign="center" mb={"3"}>
        <p
          className={css({
            fontWeight: "bold",
          })}
        >
          Signer: {wallet.address}
        </p>
        (prvKey: {wallet.privateKey})
      </Box>
      <Box textAlign="center" mb={"3"}>
        <p
          className={css({
            fontWeight: "bold",
            mb: "1",
          })}
        >
          Counter Factual Address: {counterFactualAddress}
        </p>
        <p>balance: {ethers.utils.formatEther(accountBalance)} ETH</p>
        <p>deployed: {accountDeployed ? "yes" : "no"}</p>
        <p>
          nonce:{" "}
          <input
            type="text"
            className={css({
              textAlign: "center",
              border: "1px solid black",
              borderRadius: "md",
            })}
            value={nonce}
            onChange={(e) => {
              if (e.target.value && !isNaN(parseInt(e.target.value))) {
                setNonce(parseInt(e.target.value));
              }
            }}
          />
        </p>
      </Box>
      <Box textAlign="center" mb={"3"}>
        <Box mb={"2"}>
          <p>
            ERC20 token balance: {accountERC20Balance.toString()}{" "}
            {erc20TokenSymbol}
          </p>
          <p>
            Owned NFTs:{" "}
            {accountOwnedNFTs.map((nft) => nft.toString()).join(", ")}
          </p>
        </Box>
        <p>
          ERC20 contract address:{" "}
          <input
            type="text"
            className={css({
              textAlign: "center",
              border: "1px solid black",
              borderRadius: "md",
              mb: "1",
            })}
            value={erc20ContractAddress}
            onChange={(e) => {
              if (
                e.target.value &&
                ethers.utils.isAddress(e.target.value.toLowerCase())
              ) {
                setERC20ContractAddress(e.target.value.toLowerCase());
              }
            }}
          />
        </p>
        <p>
          NFT contract address:{" "}
          <input
            type="text"
            className={css({
              textAlign: "center",
              border: "1px solid black",
              borderRadius: "md",
              mb: "1",
            })}
            value={nftContractAddress}
            onChange={(e) => {
              if (
                e.target.value &&
                ethers.utils.isAddress(e.target.value.toLowerCase())
              ) {
                setNFTContractAddress(e.target.value.toLowerCase());
              }
            }}
          />
        </p>
      </Box>
      <Box mb={"3"}>
        <h2
          className={css({
            pt: "3",
            mb: "1",
            textAlign: "center",
            fontSize: "1.5rem",
            fontWeight: "bold",
          })}
        >
          Tx Editor
        </h2>
        <Box mb={"3"}>
          type:{" "}
          <select
            className={css({
              textAlign: "center",
              border: "1px solid black",
              borderRadius: "md",
              mr: "3",
            })}
            value={txType}
            onChange={(e) => {
              setTxType(e.target.value as "ETH" | "ERC20" | "ERC721");
              setTxStruct(undefined);
            }}
          >
            <option value="ETH">ETH</option>
            <option value="ERC20">ERC20</option>
            <option value="ERC721">ERC721</option>
          </select>
        </Box>
        <Box mb={"3"}>
          to:{" "}
          <input
            type="text"
            className={css({
              textAlign: "center",
              border: "1px solid black",
              borderRadius: "md",
              mr: "3",
            })}
            value={txTo}
            onChange={(e) => {
              setTxTo(e.target.value);
              setTxStruct(undefined);
              if (!e.target.value || !ethers.utils.isAddress(e.target.value)) {
                setTxInputError("invalid address");
              } else {
                setTxInputError("");
              }
            }}
          />
          {txInputError && (
            <span
              className={css({
                color: "red",
              })}
            >
              {txInputError}
            </span>
          )}
        </Box>
        <Box mb={"3"}>
          {txType == "ERC721" ? "tokenID" : "amount"}:{" "}
          <input
            type="text"
            className={css({
              textAlign: "center",
              border: "1px solid black",
              borderRadius: "md",
              mr: "3",
            })}
            value={txValue.toString()}
            onChange={(e) => {
              if (e.target.value && !isNaN(parseInt(e.target.value))) {
                setTxValue(parseInt(e.target.value));
                setTxStruct(undefined);
              }
            }}
          />
          {txType == "ETH" ? "ETH" : txType == "ERC20" ? erc20TokenSymbol : ""}
        </Box>
        <Button
          disabled={isTxSending}
          onClick={async () => {
            if (!accountApi) {
              return;
            }

            setIsTxSending(true);

            let callData;
            switch (txType) {
              case "ETH":
                callData = "0x";
                break;
              case "ERC20":
                callData = SampleToken__factory.connect(
                  erc20ContractAddress,
                  provider
                ).interface.encodeFunctionData("transfer", [
                  txTo,
                  ethers.utils.parseEther(txValue.toString()),
                ]);
                break;
              case "ERC721":
                callData = SampleNFT__factory.connect(
                  nftContractAddress,
                  provider
                ).interface.encodeFunctionData(
                  "safeTransferFrom(address,address,uint256)",
                  [counterFactualAddress, txTo, txValue]
                );
                break;
              default:
                callData = "0x";
                break;
            }
            setTxFunctionCallData(callData);

            const userOp = await accountApi.createSignedUserOp({
              target:
                txType == "ETH"
                  ? txTo
                  : txType == "ERC20"
                  ? erc20ContractAddress
                  : nftContractAddress,
              value:
                txType == "ETH"
                  ? ethers.utils.parseEther(txValue.toString())
                  : 0,
              data: callData,
            });

            const userOpHash = await bundlerProvider.sendUserOpToBundler(
              userOp
            );
            const txid = await accountApi.getUserOpReceipt(userOpHash);
            setTxStruct(userOp);

            console.log(
              "Transaction sent!\n",
              "userOpHash:",
              userOpHash,
              "\n",
              "txid:",
              txid
            );
            setIsTxSending(false);
          }}
        >
          Send Tx
        </Button>
        {txStruct && (
          <Box
            className={css({
              border: "1px solid black",
              borderRadius: "md",
              mt: "3",
              p: "3",
            })}
          >
            <p>sender: {txStruct.sender}</p>
            <p>nonce: {txStruct.nonce.toString()}</p>
            <p>initCode: {txStruct.initCode.toString()}</p>
            <p>callData (bytes): {txStruct.callData.toString()}</p>
            <p>callData (decoded): {decodeFunctionData()}</p>
            <p>callGasLimit: {txStruct.callGasLimit.toString()}</p>
            <p>
              verificationGasLimit: {txStruct.verificationGasLimit.toString()}
            </p>
            <p>preVerificationGas: {txStruct.preVerificationGas.toString()}</p>
            <p>maxFeePerGas: {txStruct.maxFeePerGas.toString()}</p>
            <p>
              maxPriorityFeePerGas: {txStruct.maxPriorityFeePerGas.toString()}
            </p>
            <p>paymasterAndData: {txStruct.paymasterAndData.toString()}</p>
            <p>signature: {txStruct.signature.toString()}</p>
          </Box>
        )}
      </Box>
    </Container>
  );
}
