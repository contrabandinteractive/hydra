// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CollabDeal
 * @notice A collaborative payment contract with recoup-first logic.
 * @dev One recipient receives 100% until recoup target is met, then splits apply.
 */
contract CollabDeal is ReentrancyGuard, Pausable {
    // ============ Enums ============

    enum Mode {
        RECOUP,
        POST_RECOUP
    }

    // ============ State Variables ============

    IERC20 public immutable MNEE;
    address public immutable creator;
    address public immutable factory;

    string public name;
    address[] public recipients;
    uint16[] public bpsAfter;
    uint8 public immutable recoupIndex;
    uint256 public immutable recoupTarget;

    uint256 public recouped;
    Mode public mode;

    mapping(address => uint256) public owed;

    uint256[] public productPrices;
    bytes32 public metadataHash;

    bool private _initialized;

    // ============ Events ============

    event PaymentReceived(
        address indexed payer,
        uint256 amount,
        uint256 productId,
        Mode modeBefore,
        uint256 recoupedAfter,
        bytes32 receiptHash
    );

    event ModeFlipped(uint256 timestamp, uint256 recoupedFinal);

    event Withdrawn(address indexed recipient, uint256 amount);

    event MetadataUpdated(bytes32 newHash);

    // ============ Errors ============

    error AlreadyInitialized();
    error InvalidRecipient();
    error InvalidBps();
    error InvalidRecoupTarget();
    error InvalidProductId();
    error InvalidAmount();
    error NothingOwed();
    error TransferFailed();
    error OnlyCreator();

    // ============ Modifiers ============

    modifier onlyCreator() {
        if (msg.sender != creator) revert OnlyCreator();
        _;
    }

    // ============ Constructor ============

    constructor(
        address _mnee,
        address _creator,
        string memory _name,
        address[] memory _recipients,
        uint16[] memory _bpsAfter,
        uint8 _recoupIndex,
        uint256 _recoupTarget,
        uint256[] memory _productPrices,
        bytes32 _metadataHash
    ) {
        MNEE = IERC20(_mnee);
        creator = _creator;
        factory = msg.sender;
        name = _name;
        recoupIndex = _recoupIndex;
        recoupTarget = _recoupTarget;
        metadataHash = _metadataHash;
        mode = Mode.RECOUP;

        // Validate and store recipients
        uint256 numRecipients = _recipients.length;
        if (numRecipients < 2 || numRecipients > 10) revert InvalidRecipient();
        if (_bpsAfter.length != numRecipients) revert InvalidBps();
        if (_recoupIndex >= numRecipients) revert InvalidRecipient();
        if (_recoupTarget == 0) revert InvalidRecoupTarget();

        uint256 totalBps;
        for (uint256 i = 0; i < numRecipients; i++) {
            if (_recipients[i] == address(0)) revert InvalidRecipient();
            totalBps += _bpsAfter[i];
        }
        if (totalBps != 10000) revert InvalidBps();

        recipients = _recipients;
        bpsAfter = _bpsAfter;
        productPrices = _productPrices;
    }

    // ============ External Functions ============

    /**
     * @notice Pay any amount to the deal
     * @param amount Amount of MNEE to pay
     * @param productId Product identifier (0 for generic payment)
     * @param receiptHash Optional hash for off-chain receipt data
     */
    function pay(uint256 amount, uint256 productId, bytes32 receiptHash) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();

        // Transfer MNEE from payer to this contract
        bool success = MNEE.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        _processPayment(amount, productId, receiptHash);
    }

    /**
     * @notice Pay for a specific product at its fixed price
     * @param productId Index into productPrices array
     * @param receiptHash Optional hash for off-chain receipt data
     */
    function payProduct(uint256 productId, bytes32 receiptHash) external nonReentrant whenNotPaused {
        if (productId >= productPrices.length) revert InvalidProductId();

        uint256 amount = productPrices[productId];
        if (amount == 0) revert InvalidAmount();

        // Transfer MNEE from payer to this contract
        bool success = MNEE.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        _processPayment(amount, productId, receiptHash);
    }

    /**
     * @notice Withdraw owed MNEE (pull payment pattern)
     */
    function withdraw() external nonReentrant whenNotPaused {
        uint256 amount = owed[msg.sender];
        if (amount == 0) revert NothingOwed();

        owed[msg.sender] = 0;

        bool success = MNEE.transfer(msg.sender, amount);
        if (!success) revert TransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Pause the contract (creator only)
     */
    function pause() external onlyCreator {
        _pause();
    }

    /**
     * @notice Unpause the contract (creator only)
     */
    function unpause() external onlyCreator {
        _unpause();
    }

    /**
     * @notice Update metadata hash (creator only)
     * @param newHash New IPFS/Arweave hash
     */
    function updateMetadataHash(bytes32 newHash) external onlyCreator {
        metadataHash = newHash;
        emit MetadataUpdated(newHash);
    }

    // ============ View Functions ============

    /**
     * @notice Get the recoup recipient address
     */
    function recoupRecipient() external view returns (address) {
        return recipients[recoupIndex];
    }

    /**
     * @notice Get all recipients
     */
    function getRecipients() external view returns (address[] memory) {
        return recipients;
    }

    /**
     * @notice Get all basis points after recoup
     */
    function getBpsAfter() external view returns (uint16[] memory) {
        return bpsAfter;
    }

    /**
     * @notice Get all product prices
     */
    function getProductPrices() external view returns (uint256[] memory) {
        return productPrices;
    }

    /**
     * @notice Get the number of recipients
     */
    function recipientCount() external view returns (uint256) {
        return recipients.length;
    }

    /**
     * @notice Get the number of products
     */
    function productCount() external view returns (uint256) {
        return productPrices.length;
    }

    /**
     * @notice Check if recoup target has been met
     */
    function isRecoupComplete() external view returns (bool) {
        return mode == Mode.POST_RECOUP;
    }

    /**
     * @notice Get remaining amount until recoup is complete
     */
    function recoupRemaining() external view returns (uint256) {
        if (mode == Mode.POST_RECOUP) return 0;
        if (recouped >= recoupTarget) return 0;
        return recoupTarget - recouped;
    }

    // ============ Internal Functions ============

    function _processPayment(uint256 amount, uint256 productId, bytes32 receiptHash) internal {
        Mode modeBefore = mode;

        if (mode == Mode.RECOUP) {
            // 100% goes to recoup recipient
            address recoupAddr = recipients[recoupIndex];
            owed[recoupAddr] += amount;
            recouped += amount;

            // Check if we've hit the target
            if (recouped >= recoupTarget) {
                mode = Mode.POST_RECOUP;
                emit ModeFlipped(block.timestamp, recouped);
            }
        } else {
            // POST_RECOUP: split according to bpsAfter
            _distributeSplit(amount);
        }

        emit PaymentReceived(msg.sender, amount, productId, modeBefore, recouped, receiptHash);
    }

    function _distributeSplit(uint256 amount) internal {
        uint256 recipientLen = recipients.length;
        uint256 distributed = 0;

        for (uint256 i = 0; i < recipientLen - 1; i++) {
            uint256 share = (amount * bpsAfter[i]) / 10000;
            owed[recipients[i]] += share;
            distributed += share;
        }

        // Last recipient gets the remainder (handles rounding dust)
        uint256 remainder = amount - distributed;
        owed[recipients[recipientLen - 1]] += remainder;
    }
}
