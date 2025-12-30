// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {CollabDealFactory} from "../src/CollabDealFactory.sol";

contract DeployScript is Script {
    // MNEE Token addresses
    address constant MNEE_MAINNET = 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF;
    address constant MNEE_SEPOLIA = 0x9CAF26bBFe63269FAF5C425f268fF81299dD9A74;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 chainId = block.chainid;

        // Allow override via MNEE_TOKEN env variable (e.g., for testing with MockMNEE)
        address mneeToken = vm.envOr("MNEE_TOKEN", address(0));

        if (mneeToken == address(0)) {
            // Use defaults if not overridden
            if (chainId == 1) {
                mneeToken = MNEE_MAINNET;
                console2.log("Deploying to Ethereum Mainnet");
            } else if (chainId == 11155111) {
                mneeToken = MNEE_SEPOLIA;
                console2.log("Deploying to Sepolia");
            } else {
                revert("MNEE_TOKEN not set for local deployment");
            }
        } else {
            console2.log("Using custom MNEE token:", mneeToken);
        }

        vm.startBroadcast(deployerPrivateKey);

        CollabDealFactory factory = new CollabDealFactory(mneeToken);
        console2.log("CollabDealFactory deployed at:", address(factory));

        vm.stopBroadcast();
    }
}
