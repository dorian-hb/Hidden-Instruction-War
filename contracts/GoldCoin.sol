// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC7984} from "confidential-contracts-v91/contracts/token/ERC7984/ERC7984.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

contract GoldCoin is ERC7984, ZamaEthereumConfig {
    uint64 private constant CLAIM_AMOUNT = 500;
    address public game;

    mapping(address => bool) private hasClaimed;
    mapping(address => uint64) private clearBalances;

    error GameAlreadySet();
    error NotGame();
    error TransfersDisabled();

    constructor() ERC7984("GOLD", "GOLD", "") {}

    function setGame(address gameAddress) external {
        if (game != address(0)) {
            revert GameAlreadySet();
        }
        require(gameAddress != address(0), "Invalid game address");
        game = gameAddress;
    }

    /// @notice Mint one-time starter gold for the sender.
    function mint() public returns (euint64 mintedAmount) {
        mintedAmount = _claimFor(msg.sender);
    }

    /// @notice Mint starter gold for a specific player (game contract only).
    function mintFor(address receiver) external returns (euint64 mintedAmount) {
        if (msg.sender != game) {
            revert NotGame();
        }
        mintedAmount = _claimFor(receiver);
    }

    function hasClaimedGold(address player) external view returns (bool) {
        return hasClaimed[player];
    }

    function clearBalanceOf(address account) external view returns (uint64) {
        return clearBalances[account];
    }

    function spendForGame(address player, uint64 amount) external returns (euint64 burned) {
        if (msg.sender != game) {
            revert NotGame();
        }
        require(clearBalances[player] >= amount, "Not enough gold");

        clearBalances[player] -= amount;

        euint64 encryptedAmount = FHE.asEuint64(amount);
        burned = _burn(player, encryptedAmount);
    }

    function claimAmount() external pure returns (uint64) {
        return CLAIM_AMOUNT;
    }

    function confidentialTransfer(address, externalEuint64, bytes calldata) public pure override returns (euint64) {
        revert TransfersDisabled();
    }

    function confidentialTransfer(address, euint64) public pure override returns (euint64) {
        revert TransfersDisabled();
    }

    function confidentialTransferFrom(
        address,
        address,
        externalEuint64,
        bytes calldata
    ) public pure override returns (euint64) {
        revert TransfersDisabled();
    }

    function confidentialTransferFrom(address, address, euint64) public pure override returns (euint64) {
        revert TransfersDisabled();
    }

    function confidentialTransferAndCall(
        address,
        externalEuint64,
        bytes calldata,
        bytes calldata
    ) public pure override returns (euint64) {
        revert TransfersDisabled();
    }

    function confidentialTransferAndCall(address, euint64, bytes calldata) public pure override returns (euint64) {
        revert TransfersDisabled();
    }

    function confidentialTransferFromAndCall(
        address,
        address,
        externalEuint64,
        bytes calldata,
        bytes calldata
    ) public pure override returns (euint64) {
        revert TransfersDisabled();
    }

    function confidentialTransferFromAndCall(address, address, euint64, bytes calldata)
        public
        pure
        override
        returns (euint64)
    {
        revert TransfersDisabled();
    }

    function _claimFor(address receiver) private returns (euint64 mintedAmount) {
        require(!hasClaimed[receiver], "Gold already claimed");
        hasClaimed[receiver] = true;

        euint64 encryptedAmount = FHE.asEuint64(CLAIM_AMOUNT);
        mintedAmount = _mint(receiver, encryptedAmount);

        clearBalances[receiver] += CLAIM_AMOUNT;

        FHE.allow(encryptedAmount, receiver);
        FHE.allowThis(encryptedAmount);
    }
}
