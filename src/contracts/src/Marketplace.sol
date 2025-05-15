// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInvoiceNFT {
    function ownerOf(uint256 tokenId) external view returns (address);

    function getApproved(uint256 tokenId) external view returns (address);

    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool);

    function transferFrom(address from, address to, uint256 tokenId) external;
}

contract Marketplace {
    IInvoiceNFT public nftContract;
    address public owner;
    address constant NFT_CONTRACT_ADDRESS =
        0x977a0b6e5c33d92Ba91D849D36fd541d9E5f7245;

    struct Listing {
        address seller;
        uint256 price;
        bool isActive;
    }

    // tokenId => Listing
    mapping(uint256 => Listing) public listings;

    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    event NFTUnlisted(uint256 indexed tokenId, address indexed seller);

    constructor() {
        nftContract = IInvoiceNFT(NFT_CONTRACT_ADDRESS);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function listNFT(uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be greater than 0");
        require(
            nftContract.ownerOf(tokenId) == msg.sender,
            "Not the owner of this NFT"
        );
        require(
            nftContract.getApproved(tokenId) == address(this) ||
                nftContract.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved to transfer NFT"
        );

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            isActive: true
        });

        emit NFTListed(tokenId, msg.sender, price);
    }

    function buyNFT(uint256 tokenId) external payable {
        Listing storage listing = listings[tokenId];
        require(listing.isActive, "NFT is not for sale");
        require(msg.value >= listing.price, "Insufficient payment");

        address seller = listing.seller;
        uint256 price = listing.price;

        // Mark listing as inactive
        listing.isActive = false;

        // Transfer NFT to buyer
        nftContract.transferFrom(seller, msg.sender, tokenId);

        // Transfer payment to seller
        (bool success, ) = seller.call{value: price}("");
        require(success, "Transfer to seller failed");

        // Return excess payment if any
        if (msg.value > price) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - price}(
                ""
            );
            require(refundSuccess, "Refund failed");
        }

        emit NFTSold(tokenId, seller, msg.sender, price);
    }

    function unlistNFT(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];
        require(listing.isActive, "NFT is not listed");
        require(listing.seller == msg.sender, "Not the seller");

        listing.isActive = false;
        emit NFTUnlisted(tokenId, msg.sender);
    }

    function getListing(
        uint256 tokenId
    ) external view returns (address seller, uint256 price, bool isActive) {
        Listing storage listing = listings[tokenId];
        return (listing.seller, listing.price, listing.isActive);
    }
}
