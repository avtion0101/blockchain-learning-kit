// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {LearningPoints} from "../contracts/LearningPoints.sol";

/// @dev The one cheatcode used here lets the test assert emitted events.
interface Vm {
    function expectEmit(
        bool checkTopic1,
        bool checkTopic2,
        bool checkTopic3,
        bool checkData,
        address emitter
    ) external;
}

/// @dev Calls LearningPoints from a different address so authorization and
///      per-sender balances can be tested without real accounts or private keys.
contract PointsActor {
    function mint(LearningPoints points, address to, uint256 amount) external {
        points.mint(to, amount);
    }

    function transfer(LearningPoints points, address to, uint256 amount) external returns (bool) {
        return points.transfer(to, amount);
    }
}

contract LearningPointsTest {
    address private constant ALICE = address(0xA11CE);
    address private constant BOB = address(0xB0B);
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    LearningPoints private points;
    PointsActor private actor;

    event Transfer(address indexed from, address indexed to, uint256 amount);

    function setUp() public {
        points = new LearningPoints();
        actor = new PointsActor();
    }

    function testOwnerIsTheDeployer() public view {
        require(points.owner() == address(this), "deployer should be owner");
    }

    function testOwnerCanMintAndTransferEventIsEmitted() public {
        vm.expectEmit(true, true, false, true, address(points));
        emit Transfer(address(0), ALICE, 100);

        points.mint(ALICE, 100);

        require(points.balanceOf(ALICE) == 100, "minted balance should be 100");
    }

    function testNonOwnerCannotMint() public {
        _assertCallRevertsWith(
            address(actor),
            abi.encodeCall(PointsActor.mint, (points, ALICE, 1)),
            LearningPoints.Unauthorized.selector
        );
    }

    function testTransferMovesBalanceAndEmitsEvent() public {
        points.mint(address(actor), 100);

        vm.expectEmit(true, true, false, true, address(points));
        emit Transfer(address(actor), BOB, 40);

        bool success = actor.transfer(points, BOB, 40);

        require(success, "transfer should return true");
        require(points.balanceOf(address(actor)) == 60, "sender balance should decrease");
        require(points.balanceOf(BOB) == 40, "recipient balance should increase");
    }

    function testTransferRejectsInsufficientBalance() public {
        points.mint(address(actor), 5);

        _assertCallRevertsWith(
            address(actor),
            abi.encodeCall(PointsActor.transfer, (points, BOB, 6)),
            LearningPoints.InsufficientBalance.selector
        );
    }

    function testMintRejectsZeroAddress() public {
        _assertCallRevertsWith(
            address(points),
            abi.encodeCall(LearningPoints.mint, (address(0), 1)),
            LearningPoints.ZeroAddress.selector
        );
    }

    function testTransferRejectsZeroAddress() public {
        points.mint(address(actor), 1);

        _assertCallRevertsWith(
            address(actor),
            abi.encodeCall(PointsActor.transfer, (points, address(0), 1)),
            LearningPoints.ZeroAddress.selector
        );
    }

    function testUnknownAccountStartsWithZeroBalance() public view {
        require(points.balanceOf(ALICE) == 0, "unknown account balance should be zero");
    }

    function _assertCallRevertsWith(address target, bytes memory payload, bytes4 expectedSelector) private {
        (bool success, bytes memory revertData) = target.call(payload);

        require(!success, "call should revert");
        require(revertData.length >= 4, "revert data should contain an error selector");

        bytes4 actualSelector;
        assembly ("memory-safe") {
            actualSelector := mload(add(revertData, 0x20))
        }

        require(actualSelector == expectedSelector, "unexpected custom error");
    }
}
