"use client";

import Button from "@src/components/button";
import { css } from "@styles/css";
import { Container, Box } from "@styles/jsx";

import { UserOperationStruct } from "@account-abstraction/contracts";
import { HttpRpcClient, SimpleAccountAPI } from "@account-abstraction/sdk";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet, ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { hexlify, resolveProperties } from "ethers/lib/utils";
import {
  SampleNFT__factory,
  SamplePaymaster__factory,
  SampleToken__factory,
} from "@/typechain-types";
import AccountView, { AccountAPIData } from "../components/accountView";

const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

type TxType = "ETH" | "ERC20" | "ERC721" | "PaymasterDeposit";

export default function Home() {
  const wallet = useMemo(() => new Wallet("0x".padEnd(66, "7")), []);

  const aaEndpoint = process.env.NEXT_PUBLIC_AA_RPC_ENDPOINT;
  const ethEndpoint = process.env.NEXT_PUBLIC_ETH_RPC_ENDPOINT;
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 1337;

  const accountFactory = process.env.NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS || "";

  const provider = useMemo(
    () => new JsonRpcProvider(ethEndpoint),
    [ethEndpoint]
  );

  const bundlerProvider = useMemo(
    () => new HttpRpcClient(aaEndpoint || "", ENTRY_POINT_ADDRESS, chainId),
    [aaEndpoint, chainId]
  );

  const [accountAPIData, setAccountAPIData] = useState<AccountAPIData>({
    accoutFactory: accountFactory,
    nonce: 0,
    accountAPI: null,
    counterFactualAddress: null,
    erc20ContractAddress:
      process.env.NEXT_PUBLIC_ERC20_CONTRACT_ADDRESS || null,
    erc20TokenSymbol: null,
    erc20TokenDecimals: null,
    nftContractAddress: process.env.NEXT_PUBLIC_ERC721_CONTRACT_ADDRESS || null,
    paymasterAddress:
      process.env.NEXT_PUBLIC_PAYMASTER_CONTRACT_ADDRESS || null,
  });

  const [usePaymaster, setUsePaymaster] = useState(false);

  const [txTo, setTxTo] = useState("");
  const [txInputError, setTxInputError] = useState("");
  const [txValue, setTxValue] = useState(0);
  const [txPaymasterOverhead, setTxPaymasterOverhead] = useState(0);
  const [txStruct, setTxStruct] = useState<UserOperationStruct>();
  const [txType, setTxType] = useState<TxType>("ETH");
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

  useEffect(() => {
    if (
      !accountAPIData.paymasterAddress ||
      !ethers.utils.isAddress(accountAPIData.paymasterAddress)
    ) {
      setUsePaymaster(false);
    }
  }, [accountAPIData.paymasterAddress]);

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
              setTxType(e.target.value as TxType);
              setTxStruct(undefined);
            }}
          >
            <option value="ETH">ETH</option>
            <option value="ERC20">ERC20</option>
            <option value="ERC721">ERC721</option>
            <option value="PaymasterDeposit">deposit to paymaster</option>
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
              if (e.target.value && !isNaN(Number(e.target.value))) {
                setTxValue(Number(e.target.value));
                setTxStruct(undefined);
              }
            }}
          />
          {txType == "ETH" || txType == "PaymasterDeposit"
            ? "ETH"
            : txType == "ERC20"
            ? accountAPIData.erc20TokenSymbol
            : ""}
        </Box>
        {txType === "PaymasterDeposit" && (
          <Box mb={"3"}>
            paymaster overhead:{" "}
            <input
              type="text"
              className={css({
                textAlign: "center",
                border: "1px solid black",
                borderRadius: "md",
                mr: "3",
              })}
              value={txPaymasterOverhead.toString()}
              onChange={(e) => {
                if (e.target.value && !isNaN(parseInt(e.target.value))) {
                  setTxPaymasterOverhead(parseInt(e.target.value));
                  setTxStruct(undefined);
                }
              }}
            />
            ETH
          </Box>
        )}
        {!accountAPIData.paymasterAddress ||
          !ethers.utils.isAddress(accountAPIData.paymasterAddress) || (
            <Box mb={"3"}>
              <label>
                <input
                  type="checkbox"
                  checked={usePaymaster}
                  onChange={(e) => {
                    setUsePaymaster(e.target.checked);
                    if (!e.target.checked) {
                      setTxPaymasterOverhead(0);
                    }
                  }}
                />
                use paymaster
              </label>
            </Box>
          )}
        <Button
          disabled={isTxSending}
          onClick={async () => {
            const {
              accountAPI,
              erc20ContractAddress,
              nftContractAddress,
              paymasterAddress,
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
              case "PaymasterDeposit": {
                if (!paymasterAddress) {
                  return;
                }

                txTarget = paymasterAddress;
                callData = SamplePaymaster__factory.connect(
                  paymasterAddress,
                  provider
                ).interface.encodeFunctionData("depositTo", [
                  txTo,
                  ethers.utils.parseEther(txPaymasterOverhead.toString()),
                ]);

                break;
              }
              default: {
                callData = "0x";
                txTarget = txTo;
                break;
              }
            }
            setTxFunctionCallData(callData);

            const unsigOp = await accountAPI.createUnsignedUserOp({
              target: txTarget,
              value:
                txType == "ETH" || txType == "PaymasterDeposit"
                  ? ethers.utils.parseEther(txValue.toString())
                  : 0,
              data: callData,
            });

            let userOp: UserOperationStruct;

            console.log(unsigOp);

            if (usePaymaster && paymasterAddress) {
              const preVerificationGas = await accountAPI.getPreVerificationGas(
                await resolveProperties({
                  ...unsigOp,
                  paymasterAndData: paymasterAddress,
                  preVerificationGas: 21000, // dummy value, just for calldata cost
                  signature: hexlify(Buffer.alloc(65, 1)), // dummy signature
                })
              );

              userOp = await accountAPI.signUserOp({
                ...unsigOp,
                preVerificationGas,
                paymasterAndData: usePaymaster ? paymasterAddress : "0x",
              });
            } else if (!usePaymaster) {
              userOp = await accountAPI.signUserOp(unsigOp);
            } else {
              return;
            }

            console.log("userOp:", userOp);
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
          {isTxSending ? "Sending..." : "Send"}
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
