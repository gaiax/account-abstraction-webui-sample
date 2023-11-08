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
  PaymasterAPI,
  SimpleAccountAPI,
} from "@account-abstraction/sdk";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ContractFactory, Wallet, ethers } from "ethers";
import { use, useEffect, useMemo, useState } from "react";
import {
  Bytes,
  arrayify,
  hexlify,
  resolveProperties,
  serializeTransaction,
} from "ethers/lib/utils";
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
    paymasterAddress: null,
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

    // if (txType == "PaymasterDeposit" && accountAPIData.paymasterAddress) {
    //   const iface = SamplePaymaster__factory.connect(
    //     accountAPIData.paymasterAddress,
    //     provider
    //   ).interface;
    //   return (
    //     "depositTo(" +
    //     iface
    //       .decodeFunctionData("depositTo(address,uint256)", txFunctionCallData)
    //       .toString() +
    //     ")"
    //   );
    // }

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
              if (e.target.value && !isNaN(parseInt(e.target.value))) {
                setTxValue(parseInt(e.target.value));
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
                // callData = SamplePaymaster__factory.connect(
                //   paymasterAddress,
                //   provider
                // ).interface.encodeFunctionData("depositTo", [
                //   txTo,
                //   ethers.utils.parseEther(txPaymasterOverhead.toString()),
                // ]);

                callData = SamplePaymaster__factory.connect(
                  paymasterAddress,
                  provider
                ).interface.encodeFunctionData("deposit");

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
