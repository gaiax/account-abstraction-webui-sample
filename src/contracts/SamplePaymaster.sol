// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@account-abstraction/contracts/core/BasePaymaster.sol";

contract SamplePaymaster is BasePaymaster {
    using UserOperationLib for UserOperation;

    uint256 public constant COST_OF_POST_OP = 35000;

    mapping(address => uint256) private balances;
    uint256 private totalUserDepositedBalance;

    constructor(
        IEntryPoint _entryPoint
    ) BasePaymaster(_entryPoint) Ownable(msg.sender) {}

    /// @inheritdoc BasePaymaster
    function _validatePaymasterUserOp(
        UserOperation calldata _userOp,
        bytes32 _userOpHash,
        uint256 _maxCost
    )
        internal
        view
        override
        returns (bytes memory context, uint256 validationData)
    {
        require(
            _userOp.verificationGasLimit >= COST_OF_POST_OP,
            "SamplePaymaster: insufficient verification gas limit"
        );

        address account = _userOp.getSender();
        require(
            balances[account] >= _maxCost,
            string(
                abi.encodePacked(
                    "SamplePaymaster: insufficient balance; ",
                    "balance=",
                    balances[account],
                    " needed=",
                    _maxCost
                )
            )
        );

        uint256 gasPrice = _userOp.maxFeePerGas;
        // comment this line to avoid using banned opcode: block.basefee
        // uint256 gasPrice = _userOp.gasPrice();

        (_userOpHash); // unused value
        return (abi.encode(account, gasPrice), 0);
    }

    /// @inheritdoc BasePaymaster
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        (address account, uint256 gasPrice) = abi.decode(
            context,
            (address, uint256)
        );

        uint256 actualCost = actualGasCost + COST_OF_POST_OP * gasPrice;

        if (mode != PostOpMode.postOpReverted) {
            balances[account] -= actualCost;
            totalUserDepositedBalance -= actualCost;
        }
    }

    /// @inheritdoc BasePaymaster
    function _requireFromEntryPoint() internal pure override {
        return;
    }

    /// Deposit to the paymaster for a designated user.
    /// @param _user The user to deposit to
    /// @param _overhead The amount to deduct from the deposit.
    ///        unused gas will be donated to the paymaster.
    function depositTo(address _user, uint256 _overhead) external payable {
        require(msg.value >= _overhead, "SamplePaymaster: insufficient value");

        balances[_user] += msg.value - _overhead;
        totalUserDepositedBalance += msg.value - _overhead;
        entryPoint.depositTo{value: msg.value - _overhead}(address(this));
    }

    /// Get the balance of a user.
    /// @param _user The user to get the balance of
    /// @return The balance of the user
    function balanceOf(address _user) external view returns (uint256) {
        return balances[_user];
    }

    /// Get the total balance of all users.
    /// @return The total balance of all users
    function totalUserBalance() external view returns (uint256) {
        return totalUserDepositedBalance;
    }

    /// Get the balance of donation.
    /// @return The balance of donation
    function balanceOfDonation() external view returns (uint256) {
        return address(this).balance - totalUserDepositedBalance;
    }
}
