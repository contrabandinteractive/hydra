// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CollabDeal} from "./CollabDeal.sol";

/**
 * @title CollabDealFactory
 * @notice Factory contract to create and track CollabDeal instances
 */
contract CollabDealFactory {
    // ============ State Variables ============

    address public immutable mneeToken;
    address[] public deals;
    mapping(address => bool) public isDeal;
    mapping(address => address[]) public creatorDeals;

    // ============ Events ============

    event DealCreated(
        address indexed deal,
        address indexed creator,
        string name,
        bytes32 metadataHash
    );

    // ============ Errors ============

    error InvalidRecipientCount();
    error InvalidRecipient();
    error InvalidBpsLength();
    error InvalidBpsSum();
    error InvalidRecoupIndex();
    error InvalidRecoupTarget();

    // ============ Constructor ============

    constructor(address _mneeToken) {
        mneeToken = _mneeToken;
    }

    // ============ External Functions ============

    /**
     * @notice Create a new CollabDeal
     * @param _name Name of the deal (e.g., "PINWHEEL – Single Drop")
     * @param _recipients Array of recipient wallet addresses
     * @param _bpsAfter Basis points for each recipient after recoup (sum = 10000)
     * @param _recoupIndex Index of the recipient who receives recoup payments
     * @param _recoupTarget Amount in MNEE that must be recouped
     * @param _productPrices Array of product prices (can be empty for "pay any amount")
     * @param _metadataHash Hash of metadata stored on IPFS/Arweave
     * @return deal Address of the newly created CollabDeal
     */
    function createDeal(
        string calldata _name,
        address[] calldata _recipients,
        uint16[] calldata _bpsAfter,
        uint8 _recoupIndex,
        uint256 _recoupTarget,
        uint256[] calldata _productPrices,
        bytes32 _metadataHash
    ) external returns (address deal) {
        // Validate inputs
        uint256 recipientCount = _recipients.length;
        if (recipientCount < 2 || recipientCount > 10) {
            revert InvalidRecipientCount();
        }
        if (_bpsAfter.length != recipientCount) {
            revert InvalidBpsLength();
        }
        if (_recoupIndex >= recipientCount) {
            revert InvalidRecoupIndex();
        }
        if (_recoupTarget == 0) {
            revert InvalidRecoupTarget();
        }

        // Validate recipients and bps sum
        uint256 totalBps = 0;
        for (uint256 i = 0; i < recipientCount; i++) {
            if (_recipients[i] == address(0)) {
                revert InvalidRecipient();
            }
            totalBps += _bpsAfter[i];
        }
        if (totalBps != 10000) {
            revert InvalidBpsSum();
        }

        // Create the deal
        CollabDeal newDeal = new CollabDeal(
            mneeToken,
            msg.sender,
            _name,
            _recipients,
            _bpsAfter,
            _recoupIndex,
            _recoupTarget,
            _productPrices,
            _metadataHash
        );

        deal = address(newDeal);
        deals.push(deal);
        isDeal[deal] = true;
        creatorDeals[msg.sender].push(deal);

        emit DealCreated(deal, msg.sender, _name, _metadataHash);

        return deal;
    }

    // ============ View Functions ============

    /**
     * @notice Get total number of deals created
     */
    function dealCount() external view returns (uint256) {
        return deals.length;
    }

    /**
     * @notice Get all deals for a creator
     */
    function getCreatorDeals(address creator) external view returns (address[] memory) {
        return creatorDeals[creator];
    }

    /**
     * @notice Get a paginated list of deals
     * @param offset Starting index
     * @param limit Maximum number of deals to return
     */
    function getDeals(uint256 offset, uint256 limit) external view returns (address[] memory result) {
        uint256 total = deals.length;
        if (offset >= total) {
            return new address[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = deals[i];
        }

        return result;
    }
}
