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
import AccountView, { AccountAPIData } from "../components/accountView";

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

  const [accountAPIData, setAccountAPIData] = useState<AccountAPIData>({
    accoutFactory: DeterministicDeployer.getAddress(
      new ContractFactory(
        SimpleAccountFactory__factory.abi,
        SimpleAccountFactory__factory.bytecode
      ),
      0,
      [ENTRY_POINT_ADDRESS]
    ),
    nonce: 0,
    accountAPI: null,
    counterFactualAddress: null,
    erc20ContractAddress: null,
    erc20TokenSymbol: null,
    erc20TokenDecimals: null,
    nftContractAddress: null,
  });

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
    const accountAPI = new SimpleAccountAPI({
      provider,
      entryPointAddress: ENTRY_POINT_ADDRESS,
      factoryAddress: accountAPIData.accoutFactory,
      owner: wallet,
      index: accountAPIData.nonce,
    });
    setAccountAPIData((prev) => {
      return {
        ...prev,
        accountAPI,
      };
    });

    const getCounterFactualAddress = async () => {
      const addr = await accountAPI.getCounterFactualAddress();
      setAccountAPIData((prev) => {
        return {
          ...prev,
          counterFactualAddress: addr,
        };
      });
    };

    getCounterFactualAddress();
  }, [accountAPIData.accoutFactory, accountAPIData.nonce, provider, wallet]);

  const decodeFunctionData = () => {
    if (!txFunctionCallData) {
      return null;
    }

    if (txType == "ERC20" && accountAPIData.erc20ContractAddress) {
      const iface = SampleToken__factory.connect(
        accountAPIData.erc20ContractAddress,
        provider
      ).interface;
      return (
        "transfer(" +
        iface.decodeFunctionData("transfer", txFunctionCallData).toString() +
        ")"
      );
    }

    if (txType == "ERC721" && accountAPIData.nftContractAddress) {
      const iface = SampleNFT__factory.connect(
        accountAPIData.nftContractAddress,
        provider
      ).interface;
      return (
        "safeTransferFrom(" +
        iface
          .decodeFunctionData(
            "safeTransferFrom(address,address,uint256)",
            txFunctionCallData
          )
          .toString() +
        ")"
      );
    }

    return null;
  };

  return (
    <Container py={"6"} maxW={"800px"}>
      <AccountView
        {...{ wallet, provider, accountAPIData, setAccountAPIData }}
      />

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
          {txType == "ETH"
            ? "ETH"
            : txType == "ERC20"
            ? accountAPIData.erc20TokenSymbol
            : ""}
        </Box>
        <Button
          disabled={isTxSending}
          onClick={async () => {
            const {
              accountAPI,
              erc20ContractAddress,
              nftContractAddress,
              counterFactualAddress,
            } = accountAPIData;
            if (accountAPI == null || !txTo || txValue < 0) {
              return;
            }

            setIsTxSending(true);

            let callData: string;
            let txTarget: string;

            switch (txType) {
              case "ETH": {
                callData = "0x";
                txTarget = txTo;
                break;
              }

              case "ERC20": {
                if (!erc20ContractAddress) {
                  return;
                }

                txTarget = erc20ContractAddress;
                callData = SampleToken__factory.connect(
                  erc20ContractAddress,
                  provider
                ).interface.encodeFunctionData("transfer", [
                  txTo,
                  ethers.utils.parseEther(txValue.toString()),
                ]);

                break;
              }
              case "ERC721": {
                if (!nftContractAddress || !counterFactualAddress) {
                  return;
                }

                txTarget = nftContractAddress;
                callData = SampleNFT__factory.connect(
                  nftContractAddress,
                  provider
                ).interface.encodeFunctionData(
                  "safeTransferFrom(address,address,uint256)",
                  [counterFactualAddress, txTo, txValue]
                );

                break;
              }
              default: {
                callData = "0x";
                txTarget = txTo;
                break;
              }
            }
            setTxFunctionCallData(callData);

            const userOp = await accountAPI.createSignedUserOp({
              target: txTarget,
              value:
                txType == "ETH"
                  ? ethers.utils.parseEther(txValue.toString())
                  : 0,
              data: callData,
            });

            const userOpHash = await bundlerProvider.sendUserOpToBundler(
              userOp
            );
            const txid = await accountAPI.getUserOpReceipt(userOpHash);
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
