const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InvoiceNFT", function () {
    let invoiceNFT;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
        invoiceNFT = await InvoiceNFT.deploy(owner.address);
        await invoiceNFT.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await invoiceNFT.owner()).to.equal(owner.address);
        });
    });

    describe("Minting", function () {
        it("Should allow owner to mint NFT", async function () {
            await invoiceNFT.safeMint(addr1.address, "ipfs://QmTest123");
            expect(await invoiceNFT.ownerOf(0)).to.equal(addr1.address);
        });

        it("Should not allow non-owner to mint NFT", async function () {
            await expect(
                invoiceNFT.connect(addr1).safeMint(addr2.address, "ipfs://QmTest123")
            ).to.be.revertedWithCustomError(invoiceNFT, "OwnableUnauthorizedAccount");
        });
    });

    describe("Token URI", function () {
        it("Should return correct token URI", async function () {
            await invoiceNFT.safeMint(addr1.address, "ipfs://QmTest123");
            expect(await invoiceNFT.tokenURI(0)).to.equal("ipfs://QmTest123");
        });

        it("Should revert for non-existent token", async function () {
            await expect(invoiceNFT.tokenURI(999)).to.be.revertedWithCustomError(
                invoiceNFT,
                "ERC721NonexistentToken"
            );
        });
    });
}); 