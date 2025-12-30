// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockMNEE} from "../src/MockMNEE.sol";

contract DeployMockMNEEScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        MockMNEE mockMnee = new MockMNEE();

        console.log("MockMNEE deployed at:", address(mockMnee));

        vm.stopBroadcast();
    }
}
