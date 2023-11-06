// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@account-abstraction/contracts/core/BasePaymaster.sol";

contract SamplePaymaster is BasePaymaster {
    mapping(address => uint256) public balances;

    constructor(
        IEntryPoint _entryPoint
    ) BasePaymaster(_entryPoint) Ownable(msg.sender) {}

    /// @inheritdoc BasePaymaster
    function _validatePaymasterUserOp(
        UserOperation calldata _userOp,
        bytes32 _userOpHash,
        uint256 _maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        require(
            balances[_userOp.sender] >= _maxCost,
            string(
                abi.encodePacked(
                    "SamplePaymaster: insufficient balance; ",
                    "balance=",
                    balances[_userOp.sender],
                    " needed=",
                    _maxCost
                )
            )
        );

        require(
            _userOpHash == keccak256(abi.encode(_userOp)),
            "SamplePaymaster: invalid userOpHash"
        );

        balances[_userOp.sender] -= _maxCost;

        return (abi.encodePacked(_userOp.sender), 0);
    }

    /// @inheritdoc BasePaymaster
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        if (context.length == 0) {
            revert("SamplePaymaster: context is empty");
        }

        if (mode == PostOpMode.opSucceeded || mode == PostOpMode.opReverted) {
            address user = abi.decode(context, (address));
            balances[user] += actualGasCost;
        } else {
            revert("SamplePaymaster: invalid mode");
        }
    }

    /// @inheritdoc BasePaymaster
    function _requireFromEntryPoint() internal override {}

    function depositTo(address _user) external payable {
        balances[_user] += msg.value;
        entryPoint.depositTo{value: msg.value}(address(this));
    }
}
