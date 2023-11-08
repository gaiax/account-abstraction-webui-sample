// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@account-abstraction/contracts/core/BasePaymaster.sol";

contract SamplePaymaster is BasePaymaster {
    mapping(address => uint256) private balances;
    uint256 private totalUserDepositedBalance;

    constructor(
        IEntryPoint _entryPoint
    ) BasePaymaster(_entryPoint) Ownable(msg.sender) {}

    /// @inheritdoc BasePaymaster
    // function _validatePaymasterUserOp(
    //     UserOperation calldata _userOp,
    //     bytes32 _userOpHash,
    //     uint256 _maxCost
    // ) internal override returns (bytes memory context, uint256 validationData) {
    //     // require(
    //     //     balances[_userOp.sender] >= _maxCost,
    //     //     string(
    //     //         abi.encodePacked(
    //     //             "SamplePaymaster: insufficient balance; ",
    //     //             "balance=",
    //     //             balances[_userOp.sender],
    //     //             " needed=",
    //     //             _maxCost
    //     //         )
    //     //     )
    //     // );

    //     // balances[_userOp.sender] = balances[_userOp.sender] - _maxCost;
    //     // totalUserDepositedBalance -= _maxCost;

    //     // (_userOpHash); // unused value
    //     // return (abi.encode(_userOp.sender), 0);
    // }
    function _validatePaymasterUserOp(
        UserOperation calldata _userOp,
        bytes32 _userOpHash,
        uint256 _maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        (_userOp, _userOpHash, _maxCost); // unused value
        return ("0x", 0);
    }

    /// @inheritdoc BasePaymaster
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        // address user = abi.decode(context, (address));
        // balances[user] += actualGasCost;
        // totalUserDepositedBalance += actualGasCost;
        // (mode); // unused value
    }

    /// @inheritdoc BasePaymaster
    function _requireFromEntryPoint() internal override {}

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
