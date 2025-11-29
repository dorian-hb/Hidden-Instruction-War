// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC7984} from "confidential-contracts-v91/contracts/token/ERC7984/ERC7984.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";

contract GoldCoin is ERC7984, ZamaEthereumConfig {
    uint64 private constant INITIAL_MINT = 1000 * 1_000_000;
    mapping(address => bool) private hasClaimed;

    constructor() ERC7984("GOLD", "GOLD", "") {}

    /// @notice Mint one-time starter gold for the sender.
    function mint() public {
        require(!hasClaimed[msg.sender], "Gold already claimed");
        hasClaimed[msg.sender] = true;

        euint64 encryptedAmount = FHE.asEuint64(INITIAL_MINT);
        _mint(msg.sender, encryptedAmount);

        FHE.allow(encryptedAmount, msg.sender);
        FHE.allowThis(encryptedAmount);
    }
}
