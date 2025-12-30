// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockMNEE
 * @notice Mock MNEE token for testing with public mint function
 */
contract MockMNEE is ERC20 {
    constructor() ERC20("Mock MNEE", "mMNEE") {}

    /**
     * @notice Mint tokens to any address (for testing only!)
     * @param to Address to mint to
     * @param amount Amount to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Faucet function - gives caller 1000 MNEE
     */
    function faucet() external {
        _mint(msg.sender, 1000 * 10**18); // 1000 MNEE
    }
}
