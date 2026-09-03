// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @title LearningPoints
/// @notice A deliberately small points ledger for learning Solidity basics.
/// @dev This is a teaching contract, not a complete ERC-20 implementation.
contract LearningPoints {
    error Unauthorized(address caller);
    error ZeroAddress();
    error InsufficientBalance(address account, uint256 available, uint256 required);

    address public immutable owner;

    mapping(address account => uint256 balance) private _balances;

    /// @notice Emitted when points are minted or transferred.
    /// @dev A mint uses address(0) as `from`, following the common token convention.
    event Transfer(address indexed from, address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized(msg.sender);
        }
        _;
    }

    /// @notice Creates `amount` points for `to`.
    /// @dev Only the address that deployed the contract may call this function.
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) {
            revert ZeroAddress();
        }

        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /// @notice Moves `amount` points from the caller to `to`.
    /// @return success Always true when the transfer succeeds; failures revert.
    function transfer(address to, uint256 amount) external returns (bool success) {
        if (to == address(0)) {
            revert ZeroAddress();
        }

        uint256 senderBalance = _balances[msg.sender];
        if (senderBalance < amount) {
            revert InsufficientBalance(msg.sender, senderBalance, amount);
        }

        unchecked {
            // Safe because the balance check above proves senderBalance >= amount.
            _balances[msg.sender] = senderBalance - amount;
        }
        _balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice Returns the number of points owned by `account`.
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
}
