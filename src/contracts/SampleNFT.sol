// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SampleNFT is ERC721URIStorage {
    uint256 private _tokenIdCount = 0;

    constructor() ERC721("SampleNFT", "SNFT") {}

    function safeMint(address _receiver) public {
        uint256 tokenId = _tokenIdCount;
        _safeMint(_receiver, tokenId);
        _tokenIdCount += 1;
    }
}
