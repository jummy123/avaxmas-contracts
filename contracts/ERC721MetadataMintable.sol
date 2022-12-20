// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract TestToken is ERC721PresetMinterPauserAutoId {
    constructor()
        ERC721PresetMinterPauserAutoId("Test token", "TST", "localhost")
    {}
}
