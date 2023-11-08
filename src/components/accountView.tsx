"use client";

import { css } from "@/styled-system/css";
import { Box } from "@/styled-system/jsx";
import {
  SampleNFT__factory,
  SamplePaymaster__factory,
  SampleToken__factory,
} from "@/typechain-types";
import { SimpleAccountAPI } from "@account-abstraction/sdk";
import { ethers } from "ethers";
import React, { useEffect, useMemo, useState } from "react";

export type AccountAPIData = {
  accoutFactory: string;
  nonce: number;
  accountAPI: SimpleAccountAPI | null;
  counterFactualAddress: string | null;
  erc20ContractAddress: string | null;
  erc20TokenSymbol: string | null;
  erc20TokenDecimals: number | null;
  nftContractAddress: string | null;
  paymasterAddress: string | null;
};

type AccountBalanceData = {
  balance: BigInt;
  erc20Balance: BigInt;
  ownedNFTs: BigInt[];
  balanceAtPaymaster: BigInt;
  balanceOfPaymaster: BigInt;
  deployed: boolean;
};

type AccountViewProps = {
  wallet: ethers.Wallet;
  provider: ethers.providers.JsonRpcProvider;
  accountAPIData: AccountAPIData;
  setAccountAPIData: React.Dispatch<React.SetStateAction<AccountAPIData>>;
};

const AccountView: React.FC<AccountViewProps> = ({
  wallet,
  provider,
  accountAPIData,
  setAccountAPIData,
}) => {
  const [accountBalance, setAccountBalance] = useState<AccountBalanceData>({
    balance: BigInt(0),
    erc20Balance: BigInt(0),
    ownedNFTs: [],
    balanceAtPaymaster: BigInt(0),
    balanceOfPaymaster: BigInt(0),
    deployed: false,
  });

  useEffect(() => {
    const getBalance = async () => {
      if (accountAPIData.counterFactualAddress) {
        const balance = await provider.getBalance(
          accountAPIData.counterFactualAddress
        );

        setAccountBalance((prev) => {
          return {
            ...prev,
            balance: BigInt(balance.toString()),
          };
        });
        return;
      }

      setAccountBalance((prev) => {
        return {
          ...prev,
          balance: BigInt(0),
        };
      });
    };

    const getERC20Balance = async () => {
      const { counterFactualAddress, erc20ContractAddress } = accountAPIData;
      if (counterFactualAddress && erc20ContractAddress) {
        const erc20 = SampleToken__factory.connect(
          erc20ContractAddress,
          provider
        );
        const decimals = await erc20.decimals();
        const symbol = await erc20.symbol();
        const balance = await erc20.balanceOf(counterFactualAddress);
        setAccountBalance((prev) => {
          return {
            ...prev,
            erc20Balance: BigInt(balance.toString()) / 10n ** BigInt(decimals),
          };
        });

        setAccountAPIData((prev) => {
          return {
            ...prev,
            erc20TokenDecimals: decimals,
            erc20TokenSymbol: symbol,
          };
        });

        return;
      }
      setAccountBalance((prev) => {
        return {
          ...prev,
          erc20Balance: BigInt(0),
        };
      });
    };

    const getNFTs = async () => {
      const { counterFactualAddress, nftContractAddress } = accountAPIData;
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

        setAccountBalance((prev) => {
          return {
            ...prev,
            ownedNFTs: ownedNFTs,
          };
        });
        return;
      }
      setAccountBalance((prev) => {
        return {
          ...prev,
          ownedNFTs: [],
        };
      });
    };

    const getBalanceAtPaymaster = async () => {
      const { counterFactualAddress, paymasterAddress } = accountAPIData;
      if (counterFactualAddress && paymasterAddress) {
        const paymaster = SampleToken__factory.connect(
          paymasterAddress,
          provider
        );

        const balance = await paymaster.balanceOf(counterFactualAddress);

        setAccountBalance((prev) => {
          return {
            ...prev,
            balanceAtPaymaster: BigInt(balance.toString()),
          };
        });
        return;
      }
      setAccountBalance((prev) => {
        return {
          ...prev,
          balanceAtPaymaster: BigInt(0),
        };
      });
    };

    const getBalanceOfPaymaster = async () => {
      const { counterFactualAddress, paymasterAddress } = accountAPIData;
      if (counterFactualAddress && paymasterAddress) {
        const paymaster = SamplePaymaster__factory.connect(
          paymasterAddress,
          provider
        );

        const balance = await paymaster.getDeposit();

        setAccountBalance((prev) => {
          return {
            ...prev,
            balanceOfPaymaster: BigInt(balance.toString()),
          };
        });
        return;
      }
      setAccountBalance((prev) => {
        return {
          ...prev,
          balanceOfPaymaster: BigInt(0),
        };
      });
    };

    const checkIsAccountDeployed = async () => {
      const { counterFactualAddress } = accountAPIData;
      if (counterFactualAddress) {
        const code = await provider.getCode(counterFactualAddress);
        setAccountBalance((prev) => {
          return {
            ...prev,
            deployed: code !== "0x",
          };
        });
        return;
      }
      setAccountBalance((prev) => {
        return {
          ...prev,
          deployed: false,
        };
      });
    };

    getBalance().catch((e) => console.error(e));
    getERC20Balance().catch((e) => console.error(e));
    getNFTs().catch((e) => console.error(e));
    getBalanceAtPaymaster().catch((e) => console.error(e));
    getBalanceOfPaymaster().catch((e) => console.error(e));
    checkIsAccountDeployed().catch((e) => console.error(e));
  }, [accountAPIData, provider, setAccountAPIData]);

  return (
    <Box>
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
          Account Factory: {accountAPIData.accoutFactory}
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
          Counter Factual Address: {accountAPIData.counterFactualAddress}
        </p>
        <p>
          balance: {ethers.utils.formatEther(accountBalance.balance.toString())}{" "}
          ETH
        </p>
        <p>
          Balance at paymaster:{" "}
          {ethers.utils.formatEther(
            accountBalance.balanceAtPaymaster.toString()
          )}{" "}
          ETH
        </p>
        <p>
          Balance of paymaster:{" "}
          {ethers.utils.formatEther(
            accountBalance.balanceOfPaymaster.toString()
          )}{" "}
          ETH
        </p>
        <p>deployed: {accountBalance.deployed ? "yes" : "no"}</p>
        <p>
          nonce:{" "}
          <input
            type="text"
            className={css({
              textAlign: "center",
              border: "1px solid black",
              borderRadius: "md",
            })}
            value={accountAPIData.nonce}
            onChange={(e) => {
              if (e.target.value && !isNaN(parseInt(e.target.value))) {
                setAccountAPIData((prev) => {
                  return {
                    ...prev,
                    nonce: parseInt(e.target.value),
                  };
                });
              }
            }}
          />
        </p>
      </Box>
      <Box textAlign="center" mb={"3"}>
        <Box mb={"2"}>
          <p>
            ERC20 token balance: {accountBalance.erc20Balance.toString()}{" "}
            {accountAPIData.erc20TokenSymbol}
          </p>
          <p>
            Owned NFTs:{" "}
            {accountBalance.ownedNFTs
              .map((nftID) => nftID.toString())
              .join(", ")}
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
            value={accountAPIData.erc20ContractAddress || ""}
            onChange={(e) => {
              if (
                e.target.value &&
                ethers.utils.isAddress(e.target.value.toLowerCase())
              ) {
                setAccountAPIData((prev) => {
                  return {
                    ...prev,
                    erc20ContractAddress: e.target.value.toLowerCase(),
                  };
                });
                return;
              }

              setAccountAPIData((prev) => {
                return {
                  ...prev,
                  erc20ContractAddress: null,
                };
              });
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
            value={accountAPIData.nftContractAddress || ""}
            onChange={(e) => {
              if (
                e.target.value &&
                ethers.utils.isAddress(e.target.value.toLowerCase())
              ) {
                setAccountAPIData((prev) => {
                  return {
                    ...prev,
                    nftContractAddress: e.target.value.toLowerCase(),
                  };
                });
                return;
              }

              setAccountAPIData((prev) => {
                return {
                  ...prev,
                  nftContractAddress: null,
                };
              });
            }}
          />
        </p>
        <p>
          Paymaster address:{" "}
          <input
            type="text"
            className={css({
              textAlign: "center",
              border: "1px solid black",
              borderRadius: "md",
              mb: "1",
            })}
            value={accountAPIData.paymasterAddress || ""}
            onChange={(e) => {
              if (
                e.target.value &&
                ethers.utils.isAddress(e.target.value.toLowerCase())
              ) {
                setAccountAPIData((prev) => {
                  return {
                    ...prev,
                    paymasterAddress: e.target.value.toLowerCase(),
                  };
                });
                return;
              }

              setAccountAPIData((prev) => {
                return {
                  ...prev,
                  paymasterAddress: null,
                };
              });
            }}
          />
        </p>
      </Box>
    </Box>
  );
};

export default AccountView;
