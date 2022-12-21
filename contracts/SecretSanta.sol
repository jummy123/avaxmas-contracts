// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";


contract SecretSanta is
    Ownable,
    IERC721Receiver,
    VRFConsumerBaseV2
{
    using EnumerableSet for EnumerableSet.AddressSet;

    struct Entry{
        address sender;
        address collection;
        uint256 tokenId;
    }

    event Deposited(
        address indexed giver,
        address indexed collection,
        uint256 tokenId
    );

    event Received(
        address indexed receiver,
        address indexed collection,
        uint256 tokenId
    );

    EnumerableSet.AddressSet private collectionAllowList;

    // VRF config.
    VRFCoordinatorV2Interface public COORDINATOR;
    uint64 s_subscriptionId;
    address vrfCoordinator;
    // see https://docs.chain.link/docs/vrf-contracts/#configurations
    bytes32 keyHash;
    uint32 callbackGasLimit = 200000;
    uint16 requestConfirmations = 3;
    uint32 numWords =  1;

    // Contract variables.
    uint256 public constant END_TIME = 1672531200;   // 2023, January 1 GMT/UTC
    bool private randomCalled;
    uint256 public randomResult;
    mapping(address => uint256) private entryIndex;
    Entry[] private entries;

    constructor(
        uint64 subscriptionId,
        address _vrfCoordinator,
        bytes32 _keyHash
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        s_subscriptionId = subscriptionId;
        keyHash = _keyHash;
    }

    /// @notice Add an ERC751 collection to the allow list.
    function allowListCollection(address collection) public onlyOwner {
        collectionAllowList.add(collection);
    }

    /// @notice Call chainlink VRF and set `randomCalled`.
    function end() public onlyOwner {
        require(randomCalled == false, "Random already initiated");
        randomCalled = true;
        COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
    }

    /// @notice Deposit a token from a verified collection and enter.
    /// @notice The contract must be approved to spend this token before calling this function.
    function deposit(address collection, uint256 tokenId) public {
        require(collectionAllowList.contains(collection) == true, "Collection not in allow list");
        require(entryIndex[msg.sender] == 0, "Address already deposied");
        IERC721(collection).safeTransferFrom(msg.sender, address(this), tokenId);
        entries.push(Entry(msg.sender, collection, tokenId));
        entryIndex[msg.sender] = entries.length;
        emit Deposited(msg.sender, collection, tokenId);
    }

    /// @notice Returns the details of a gift for a giver.
    function senderDetails(address giver) public view returns (address, uint256) {
        Entry memory entry = entries[entryIndex[giver] - 1];
        return (entry.collection, entry.tokenId);
    }

    /// @notice Returns the collection, tokenId and for a gift.
    /// @notice Returns null, null, null if raffle not ended.
    function receiverDetails(address receiver) public view returns (address, uint256) {
        require(randomResult != 0, "Not ended");
        Entry memory entry = entries[(entryIndex[receiver] + randomResult) % entries.length];
        return (entry.collection, entry.tokenId);
    }

    /// @notice Sends the token received to the caller.
    function claim() public {
        require(randomResult != 0, "Not ended");
        require(entryIndex[msg.sender] != 0, "Not entered");
        Entry memory entry = entries[(entryIndex[msg.sender] + randomResult) % entries.length];
        require(IERC721(entry.collection).ownerOf(entry.tokenId) == address(this), "Already claimed");
        IERC721(entry.collection).safeTransferFrom(address(this), msg.sender, entry.tokenId);
        emit Received(msg.sender, entry.collection, entry.tokenId);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        randomResult = randomWords[0];
    }

    function onERC721Received(
        address, /*operator*/
        address, /*from*/
        uint256, /*tokenId*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return SecretSanta.onERC721Received.selector;
    }

}
