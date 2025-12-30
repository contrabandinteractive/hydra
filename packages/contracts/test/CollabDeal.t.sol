// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CollabDeal} from "../src/CollabDeal.sol";
import {CollabDealFactory} from "../src/CollabDealFactory.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract CollabDealTest is Test {
    MockERC20 public mnee;
    CollabDealFactory public factory;
    CollabDeal public deal;

    address public creator = address(0x1);
    address public artist = address(0x2);
    address public producer = address(0x3);
    address public editor = address(0x4);
    address public buyer = address(0x5);
    address public buyer2 = address(0x6);

    uint256 public constant RECOUP_TARGET = 30e18; // 30 MNEE
    uint256 public constant PRODUCT_PRICE = 10e18; // 10 MNEE

    function setUp() public {
        // Deploy mock MNEE token
        mnee = new MockERC20("MNEE", "MNEE", 18);

        // Deploy factory
        factory = new CollabDealFactory(address(mnee));

        // Create a deal: Producer recoups 30 MNEE first
        // After recoup: Artist 70%, Producer 20%, Editor 10%
        address[] memory recipients = new address[](3);
        recipients[0] = artist;
        recipients[1] = producer;
        recipients[2] = editor;

        uint16[] memory bpsAfter = new uint16[](3);
        bpsAfter[0] = 7000; // 70%
        bpsAfter[1] = 2000; // 20%
        bpsAfter[2] = 1000; // 10%

        uint256[] memory prices = new uint256[](1);
        prices[0] = PRODUCT_PRICE;

        vm.prank(creator);
        address dealAddr = factory.createDeal(
            "Test Track",
            recipients,
            bpsAfter,
            1, // producer is recoup recipient
            RECOUP_TARGET,
            prices,
            bytes32(0)
        );

        deal = CollabDeal(dealAddr);

        // Fund buyers with MNEE
        mnee.mint(buyer, 1000e18);
        mnee.mint(buyer2, 1000e18);
    }

    // ============ Factory Tests ============

    function test_FactoryCreatesValidDeal() public view {
        assertEq(factory.dealCount(), 1);
        assertTrue(factory.isDeal(address(deal)));
        address[] memory creatorDealsList = factory.getCreatorDeals(creator);
        assertEq(creatorDealsList.length, 1);
        assertEq(creatorDealsList[0], address(deal));
    }

    function test_FactoryRejectsInvalidRecipientCount() public {
        address[] memory recipients = new address[](1);
        recipients[0] = artist;

        uint16[] memory bpsAfter = new uint16[](1);
        bpsAfter[0] = 10000;

        uint256[] memory prices = new uint256[](0);

        vm.expectRevert(CollabDealFactory.InvalidRecipientCount.selector);
        factory.createDeal("Test", recipients, bpsAfter, 0, 100e18, prices, bytes32(0));
    }

    function test_FactoryRejectsZeroRecoupTarget() public {
        address[] memory recipients = new address[](2);
        recipients[0] = artist;
        recipients[1] = producer;

        uint16[] memory bpsAfter = new uint16[](2);
        bpsAfter[0] = 5000;
        bpsAfter[1] = 5000;

        uint256[] memory prices = new uint256[](0);

        vm.expectRevert(CollabDealFactory.InvalidRecoupTarget.selector);
        factory.createDeal("Test", recipients, bpsAfter, 0, 0, prices, bytes32(0));
    }

    function test_FactoryRejectsInvalidBpsSum() public {
        address[] memory recipients = new address[](2);
        recipients[0] = artist;
        recipients[1] = producer;

        uint16[] memory bpsAfter = new uint16[](2);
        bpsAfter[0] = 5000;
        bpsAfter[1] = 4000; // Only 9000, not 10000

        uint256[] memory prices = new uint256[](0);

        vm.expectRevert(CollabDealFactory.InvalidBpsSum.selector);
        factory.createDeal("Test", recipients, bpsAfter, 0, 100e18, prices, bytes32(0));
    }

    // ============ Recoup Mode Tests ============

    function test_RecoupModePaysFull100ToRecoupRecipient() public {
        // Approve and pay
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE);
        deal.payProduct(0, bytes32(0));
        vm.stopPrank();

        // Producer should have full amount owed
        assertEq(deal.owed(producer), PRODUCT_PRICE);
        assertEq(deal.owed(artist), 0);
        assertEq(deal.owed(editor), 0);
        assertEq(deal.recouped(), PRODUCT_PRICE);
        assertTrue(deal.mode() == CollabDeal.Mode.RECOUP);
    }

    function test_RecoupModeAccumulatesMultiplePayments() public {
        // First payment
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE * 2);
        deal.payProduct(0, bytes32(0));

        // Second payment
        deal.payProduct(0, bytes32(0));
        vm.stopPrank();

        assertEq(deal.owed(producer), PRODUCT_PRICE * 2);
        assertEq(deal.recouped(), PRODUCT_PRICE * 2);
        assertTrue(deal.mode() == CollabDeal.Mode.RECOUP);
    }

    // ============ Mode Flip Tests ============

    function test_ModeFlipsWhenRecoupTargetReached() public {
        // Pay exactly the recoup target (3 x 10 = 30)
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE * 3);

        // First two payments - still in recoup
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));
        assertTrue(deal.mode() == CollabDeal.Mode.RECOUP);

        // Third payment - should flip
        deal.payProduct(0, bytes32(0));
        assertTrue(deal.mode() == CollabDeal.Mode.POST_RECOUP);
        vm.stopPrank();

        assertEq(deal.recouped(), RECOUP_TARGET);
        assertEq(deal.owed(producer), RECOUP_TARGET);
    }

    function test_ModeFlipsWhenRecoupTargetExceeded() public {
        // Create a deal with 25 MNEE target, pay 30 to exceed
        address[] memory recipients = new address[](2);
        recipients[0] = artist;
        recipients[1] = producer;

        uint16[] memory bpsAfter = new uint16[](2);
        bpsAfter[0] = 6000;
        bpsAfter[1] = 4000;

        uint256[] memory prices = new uint256[](1);
        prices[0] = 15e18; // 15 MNEE per product

        vm.prank(creator);
        address newDealAddr = factory.createDeal(
            "Test 2",
            recipients,
            bpsAfter,
            1, // producer is recoup recipient
            25e18, // 25 MNEE target
            prices,
            bytes32(0)
        );

        CollabDeal newDeal = CollabDeal(newDealAddr);

        // Pay twice (30 MNEE total, exceeds 25 MNEE target)
        vm.startPrank(buyer);
        mnee.approve(newDealAddr, 30e18);
        newDeal.payProduct(0, bytes32(0)); // 15 MNEE
        assertTrue(newDeal.mode() == CollabDeal.Mode.RECOUP);

        newDeal.payProduct(0, bytes32(0)); // 15 MNEE more
        assertTrue(newDeal.mode() == CollabDeal.Mode.POST_RECOUP);
        vm.stopPrank();

        // Producer should have all 30 MNEE (overage goes to them in recoup mode)
        assertEq(newDeal.owed(producer), 30e18);
    }

    // ============ Post-Recoup Split Tests ============

    function test_PostRecoupSplitsCorrectly() public {
        // First, complete recoup
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE * 4);
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));
        assertTrue(deal.mode() == CollabDeal.Mode.POST_RECOUP);

        // Now make a post-recoup payment
        deal.payProduct(0, bytes32(0));
        vm.stopPrank();

        // Check splits: 70% / 20% / 10% of 10 MNEE
        assertEq(deal.owed(artist), 7e18);
        assertEq(deal.owed(producer), RECOUP_TARGET + 2e18); // 30 + 2
        assertEq(deal.owed(editor), 1e18);
    }

    function test_PostRecoupMultiplePaymentsAccumulateCorrectly() public {
        // Complete recoup
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE * 5);
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));

        // Two post-recoup payments
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));
        vm.stopPrank();

        // Check accumulated splits: 70% / 20% / 10% of 20 MNEE
        assertEq(deal.owed(artist), 14e18);
        assertEq(deal.owed(producer), RECOUP_TARGET + 4e18); // 30 + 4
        assertEq(deal.owed(editor), 2e18);
    }

    // ============ Rounding Dust Tests ============

    function test_RoundingDustGoesToLastRecipient() public {
        // Create a deal with splits that cause rounding
        address[] memory recipients = new address[](3);
        recipients[0] = artist;
        recipients[1] = producer;
        recipients[2] = editor;

        uint16[] memory bpsAfter = new uint16[](3);
        bpsAfter[0] = 3333; // 33.33%
        bpsAfter[1] = 3333; // 33.33%
        bpsAfter[2] = 3334; // 33.34%

        uint256[] memory prices = new uint256[](0);

        vm.prank(creator);
        address roundingDealAddr = factory.createDeal(
            "Rounding Test",
            recipients,
            bpsAfter,
            0,
            1e18, // 1 MNEE target
            prices,
            bytes32(0)
        );

        CollabDeal roundingDeal = CollabDeal(roundingDealAddr);

        // Complete recoup
        vm.startPrank(buyer);
        mnee.approve(roundingDealAddr, 100e18);
        roundingDeal.pay(1e18, 0, bytes32(0));

        // Pay an amount that causes rounding: 100 wei
        // 33.33% of 100 = 33.33 -> 33 wei
        // 33.33% of 100 = 33.33 -> 33 wei
        // Remainder = 100 - 33 - 33 = 34 wei (goes to editor)
        roundingDeal.pay(100, 0, bytes32(0));
        vm.stopPrank();

        // Artist has 1e18 (recoup) + 33 (split)
        assertEq(roundingDeal.owed(artist), 1e18 + 33);
        assertEq(roundingDeal.owed(producer), 33);
        assertEq(roundingDeal.owed(editor), 34);

        // Total post-recoup split should equal 100 wei
        uint256 postRecoupTotal = (roundingDeal.owed(artist) - 1e18) + roundingDeal.owed(producer) + roundingDeal.owed(editor);
        assertEq(postRecoupTotal, 100);
    }

    // ============ Withdrawal Tests ============

    function test_WithdrawalPaysCorrectAmount() public {
        // Make a payment
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE);
        deal.payProduct(0, bytes32(0));
        vm.stopPrank();

        // Producer withdraws
        uint256 balanceBefore = mnee.balanceOf(producer);
        vm.prank(producer);
        deal.withdraw();
        uint256 balanceAfter = mnee.balanceOf(producer);

        assertEq(balanceAfter - balanceBefore, PRODUCT_PRICE);
        assertEq(deal.owed(producer), 0);
    }

    function test_WithdrawalResetsOwed() public {
        // Make payments
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE * 4);
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));
        vm.stopPrank();

        // Partial withdrawal - producer first
        vm.prank(producer);
        deal.withdraw();
        assertEq(deal.owed(producer), 0);

        // Artist withdraws (from post-recoup split)
        vm.prank(artist);
        deal.withdraw();
        assertEq(deal.owed(artist), 0);

        // Editor withdraws
        vm.prank(editor);
        deal.withdraw();
        assertEq(deal.owed(editor), 0);

        // Deal contract should have no MNEE left
        assertEq(mnee.balanceOf(address(deal)), 0);
    }

    function test_WithdrawalFailsWithNothingOwed() public {
        vm.prank(artist);
        vm.expectRevert(CollabDeal.NothingOwed.selector);
        deal.withdraw();
    }

    // ============ Pause Tests ============

    function test_PausePreventsPayments() public {
        vm.prank(creator);
        deal.pause();

        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE);
        vm.expectRevert();
        deal.payProduct(0, bytes32(0));
        vm.stopPrank();
    }

    function test_PausePreventsWithdrawals() public {
        // Make a payment first
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE);
        deal.payProduct(0, bytes32(0));
        vm.stopPrank();

        // Pause
        vm.prank(creator);
        deal.pause();

        // Try to withdraw
        vm.prank(producer);
        vm.expectRevert();
        deal.withdraw();
    }

    function test_UnpauseRestoresFunction() public {
        vm.prank(creator);
        deal.pause();

        vm.prank(creator);
        deal.unpause();

        // Should work now
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE);
        deal.payProduct(0, bytes32(0));
        vm.stopPrank();

        assertEq(deal.owed(producer), PRODUCT_PRICE);
    }

    function test_OnlyCreatorCanPause() public {
        vm.prank(artist);
        vm.expectRevert(CollabDeal.OnlyCreator.selector);
        deal.pause();
    }

    // ============ View Function Tests ============

    function test_RecoupRemainingReturnsCorrectValue() public {
        assertEq(deal.recoupRemaining(), RECOUP_TARGET);

        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE * 3);

        deal.payProduct(0, bytes32(0));
        assertEq(deal.recoupRemaining(), 20e18);

        deal.payProduct(0, bytes32(0));
        assertEq(deal.recoupRemaining(), 10e18);

        deal.payProduct(0, bytes32(0));
        assertEq(deal.recoupRemaining(), 0);
        vm.stopPrank();
    }

    function test_IsRecoupCompleteReturnsCorrectValue() public {
        assertFalse(deal.isRecoupComplete());

        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE * 3);
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));
        vm.stopPrank();

        assertTrue(deal.isRecoupComplete());
    }

    function test_GettersReturnCorrectData() public view {
        assertEq(deal.name(), "Test Track");
        assertEq(deal.creator(), creator);
        assertEq(deal.recoupRecipient(), producer);
        assertEq(deal.recoupTarget(), RECOUP_TARGET);
        assertEq(deal.recipientCount(), 3);
        assertEq(deal.productCount(), 1);

        address[] memory recipients = deal.getRecipients();
        assertEq(recipients[0], artist);
        assertEq(recipients[1], producer);
        assertEq(recipients[2], editor);

        uint16[] memory bps = deal.getBpsAfter();
        assertEq(bps[0], 7000);
        assertEq(bps[1], 2000);
        assertEq(bps[2], 1000);

        uint256[] memory prices = deal.getProductPrices();
        assertEq(prices[0], PRODUCT_PRICE);
    }

    // ============ Pay (Generic Amount) Tests ============

    function test_PayAcceptsAnyAmount() public {
        vm.startPrank(buyer);
        mnee.approve(address(deal), 25e18);
        deal.pay(25e18, 0, bytes32(0));
        vm.stopPrank();

        assertEq(deal.owed(producer), 25e18);
        assertEq(deal.recouped(), 25e18);
    }

    function test_PayRejectsZeroAmount() public {
        vm.startPrank(buyer);
        mnee.approve(address(deal), 100e18);
        vm.expectRevert(CollabDeal.InvalidAmount.selector);
        deal.pay(0, 0, bytes32(0));
        vm.stopPrank();
    }

    // ============ Events Tests ============

    function test_EmitsPaymentReceivedEvent() public {
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE);

        vm.expectEmit(true, true, true, true);
        emit CollabDeal.PaymentReceived(
            buyer,
            PRODUCT_PRICE,
            0,
            CollabDeal.Mode.RECOUP,
            PRODUCT_PRICE,
            bytes32(0)
        );

        deal.payProduct(0, bytes32(0));
        vm.stopPrank();
    }

    function test_EmitsModeFlippedEvent() public {
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE * 3);
        deal.payProduct(0, bytes32(0));
        deal.payProduct(0, bytes32(0));

        // Third payment should emit ModeFlipped
        vm.expectEmit(true, true, true, true);
        emit CollabDeal.ModeFlipped(block.timestamp, RECOUP_TARGET);

        deal.payProduct(0, bytes32(0));
        vm.stopPrank();
    }

    function test_EmitsWithdrawnEvent() public {
        vm.startPrank(buyer);
        mnee.approve(address(deal), PRODUCT_PRICE);
        deal.payProduct(0, bytes32(0));
        vm.stopPrank();

        vm.expectEmit(true, true, true, true);
        emit CollabDeal.Withdrawn(producer, PRODUCT_PRICE);

        vm.prank(producer);
        deal.withdraw();
    }
}
