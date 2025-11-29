// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint32, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted city builder game
/// @notice Players claim gold and spend it to build encrypted structures.
contract WarGame is ZamaEthereumConfig {
    uint64 private constant GOLD_CLAIM_AMOUNT = 500;
    uint64 private constant BASE_PRICE = 100;
    uint64 private constant BARRACKS_PRICE = 10;
    uint64 private constant FARM_PRICE = 10;

    mapping(address => uint256) private goldBalances;
    mapping(address => euint64) private encryptedGoldBalances;
    mapping(address => euint32[]) private playerBuildings;
    mapping(address => bool) private hasClaimed;

    event GoldClaimed(address indexed player, uint256 amount);
    event BuildingConstructed(address indexed player, uint8 buildingType, uint256 price, uint256 remainingGold);

    /// @notice Claim starter gold once.
    function claimGold() external {
        require(!hasClaimed[msg.sender], "Gold already claimed");
        hasClaimed[msg.sender] = true;

        goldBalances[msg.sender] += GOLD_CLAIM_AMOUNT;
        euint64 updatedBalance = FHE.add(encryptedGoldBalances[msg.sender], FHE.asEuint64(GOLD_CLAIM_AMOUNT));
        encryptedGoldBalances[msg.sender] = _allowGoldAccess(updatedBalance, msg.sender);

        emit GoldClaimed(msg.sender, GOLD_CLAIM_AMOUNT);
    }

    /// @notice Build a structure by spending gold.
    /// @param buildingType 1 = base, 2 = barracks, 3 = farm
    function build(uint8 buildingType) external {
        require(buildingType >= 1 && buildingType <= 3, "Unsupported building");

        uint64 cost = _getCost(buildingType);
        require(goldBalances[msg.sender] >= cost, "Not enough gold");

        goldBalances[msg.sender] -= cost;
        euint64 updatedBalance = FHE.sub(encryptedGoldBalances[msg.sender], FHE.asEuint64(cost));
        encryptedGoldBalances[msg.sender] = _allowGoldAccess(updatedBalance, msg.sender);

        euint32 encryptedType = FHE.asEuint32(buildingType);
        euint32 shareableType = _allowBuildingAccess(encryptedType, msg.sender);
        playerBuildings[msg.sender].push(shareableType);

        emit BuildingConstructed(msg.sender, buildingType, cost, goldBalances[msg.sender]);
    }

    /// @notice Get the clear gold balance for a player.
    function getGoldBalance(address player) external view returns (uint256) {
        return goldBalances[player];
    }

    /// @notice Get the encrypted gold balance for a player.
    function getEncryptedGold(address player) external view returns (euint64) {
        return encryptedGoldBalances[player];
    }

    /// @notice Get encrypted building ids for a player.
    function getBuildings(address player) external view returns (euint32[] memory) {
        return playerBuildings[player];
    }

    /// @notice Check whether a player already claimed starter gold.
    function hasClaimedGold(address player) external view returns (bool) {
        return hasClaimed[player];
    }

    function _getCost(uint8 buildingType) private pure returns (uint64) {
        if (buildingType == 1) {
            return BASE_PRICE;
        }
        if (buildingType == 2) {
            return BARRACKS_PRICE;
        }
        return FARM_PRICE;
    }

    function _allowGoldAccess(euint64 value, address player) private returns (euint64) {
        FHE.allow(value, player);
        FHE.allowThis(value);
        return value;
    }

    function _allowBuildingAccess(euint32 value, address player) private returns (euint32) {
        FHE.allow(value, player);
        FHE.allowThis(value);
        return value;
    }
}
