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
import { serializeTransaction } from "ethers/lib/utils";

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

  const [accountBalance, setAccountBalance] = useState(BigInt(0));
  const [accountDeployed, setAccountDeployed] = useState(false);

  const [txTo, setTxTo] = useState("");
  const [txInputError, setTxInputError] = useState("");
  const [txValue, setTxValue] = useState(0);
  const [txStruct, setTxStruct] = useState<UserOperationStruct>();

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
          value:{" "}
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
              }
            }}
          />
          ETH
        </Box>
        <Button
          onClick={async () => {
            if (!accountApi) {
              return;
            }

            const userOp = await accountApi.createSignedUserOp({
              target: txTo,
              value: ethers.utils.parseEther(txValue.toString()),
              data: "0x",
            });
            setTxStruct(userOp);

            const userOpHash = await bundlerProvider.sendUserOpToBundler(
              userOp
            );
            const txid = await accountApi.getUserOpReceipt(userOpHash);

            console.log(
              "Transaction sent!\n",
              "userOpHash:",
              userOpHash,
              "\n",
              "txid:",
              txid
            );
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
            <p>callData: {txStruct.callData.toString()}</p>
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
