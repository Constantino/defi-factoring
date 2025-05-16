// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CreditHandler is Ownable {
    IERC721 public nftContract;

    struct Credit {
        address lender;
        address lendee;
        uint256 amountOfCredit;
        uint256 dueBy;
        uint256 tokenId;
        bool isPaid;
    }

    // Mapping from credit ID to Credit struct
    mapping(uint256 => Credit) public credits;
    uint256 public creditCounter;

    event CreditOpened(
        uint256 indexed creditId,
        address indexed lender,
        address indexed lendee,
        uint256 amount,
        uint256 dueBy,
        uint256 tokenId
    );
    event CreditPaid(
        uint256 indexed creditId,
        address indexed payer,
        address indexed lender,
        uint256 tokenId
    );

    constructor(address _nftContract) Ownable(msg.sender) {
        nftContract = IERC721(_nftContract);
    }

    function openCredit(
        address _lendee,
        uint256 _amountOfCredit,
        uint256 _dueBy,
        uint256 _tokenId
    ) external returns (uint256) {
        require(_lendee != address(0), "Invalid lendee address");
        require(_amountOfCredit > 0, "Credit amount must be greater than 0");
        require(
            nftContract.ownerOf(_tokenId) == _lendee,
            "Lendee is not the owner of this NFT"
        );
        require(
            nftContract.getApproved(_tokenId) == address(this) ||
                nftContract.isApprovedForAll(_lendee, address(this)),
            "CreditHandler not approved to transfer NFT"
        );

        uint256 creditId = creditCounter++;
        credits[creditId] = Credit({
            lender: msg.sender,
            lendee: _lendee,
            amountOfCredit: _amountOfCredit,
            dueBy: _dueBy,
            tokenId: _tokenId,
            isPaid: false
        });

        emit CreditOpened(
            creditId,
            msg.sender,
            _lendee,
            _amountOfCredit,
            _dueBy,
            _tokenId
        );
        return creditId;
    }

    function payCredit(uint256 _creditId) external payable {
        Credit storage credit = credits[_creditId];
        require(!credit.isPaid, "Credit already paid");
        require(msg.value >= credit.amountOfCredit, "Insufficient payment");
        require(block.timestamp <= credit.dueBy, "Credit has expired");
        require(msg.sender == credit.lendee, "Only lendee can pay");

        credit.isPaid = true;

        // Transfer NFT to the lender
        nftContract.transferFrom(credit.lendee, credit.lender, credit.tokenId);

        // Transfer payment to the lender
        (bool success, ) = credit.lender.call{value: msg.value}("");
        require(success, "Payment transfer failed");

        emit CreditPaid(_creditId, msg.sender, credit.lender, credit.tokenId);
    }

    // Function to check credit status
    function getCredit(
        uint256 _creditId
    )
        external
        view
        returns (
            address lender,
            address lendee,
            uint256 amountOfCredit,
            uint256 dueBy,
            uint256 tokenId,
            bool isPaid
        )
    {
        Credit storage credit = credits[_creditId];
        return (
            credit.lender,
            credit.lendee,
            credit.amountOfCredit,
            credit.dueBy,
            credit.tokenId,
            credit.isPaid
        );
    }
}
