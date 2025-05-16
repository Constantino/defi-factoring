const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
    let marketplace;
    let invoiceNFT;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy InvoiceNFT
        const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
        invoiceNFT = await InvoiceNFT.deploy(owner.address);
        await invoiceNFT.waitForDeployment();

        // Deploy Marketplace
        const Marketplace = await ethers.getContractFactory("Marketplace");
        marketplace = await Marketplace.deploy(await invoiceNFT.getAddress());
        await marketplace.waitForDeployment();

        // Mint an NFT to owner
        await invoiceNFT.safeMint(owner.address, "ipfs://QmTest123");
    });

    describe("Listing", function () {
        it("Should allow owner to list NFT", async function () {
            const tokenId = 0;
            const price = ethers.parseEther("1.0");

            // Approve marketplace
            await invoiceNFT.approve(await marketplace.getAddress(), tokenId);

            // List NFT
            await marketplace.listNFT(tokenId, price);

            const listing = await marketplace.listings(tokenId);
            expect(listing.seller).to.equal(owner.address);
            expect(listing.price).to.equal(price);
            expect(listing.isActive).to.be.true;
        });

        it("Should not allow non-owner to list NFT", async function () {
            const tokenId = 0;
            const price = ethers.parseEther("1.0");

            await expect(
                marketplace.connect(addr1).listNFT(tokenId, price)
            ).to.be.revertedWith("Not the owner of this NFT");
        });
    });

    describe("Buying", function () {
        beforeEach(async function () {
            const tokenId = 0;
            const price = ethers.parseEther("1.0");

            // Approve and list NFT
            await invoiceNFT.approve(await marketplace.getAddress(), tokenId);
            await marketplace.listNFT(tokenId, price);
        });

        it("Should allow buying listed NFT", async function () {
            const tokenId = 0;
            const price = ethers.parseEther("1.0");

            await marketplace.connect(addr1).buyNFT(tokenId, { value: price });

            expect(await invoiceNFT.ownerOf(tokenId)).to.equal(addr1.address);
            const listing = await marketplace.listings(tokenId);
            expect(listing.isActive).to.be.false;
        });

        it("Should not allow buying with wrong price", async function () {
            const tokenId = 0;
            const wrongPrice = ethers.parseEther("0.5");

            await expect(
                marketplace.connect(addr1).buyNFT(tokenId, { value: wrongPrice })
            ).to.be.revertedWith("Insufficient payment");
        });
    });

    describe("Unlisting", function () {
        beforeEach(async function () {
            const tokenId = 0;
            const price = ethers.parseEther("1.0");

            // Approve and list NFT
            await invoiceNFT.approve(await marketplace.getAddress(), tokenId);
            await marketplace.listNFT(tokenId, price);
        });

        it("Should allow seller to unlist NFT", async function () {
            const tokenId = 0;

            await marketplace.unlistNFT(tokenId);

            const listing = await marketplace.listings(tokenId);
            expect(listing.isActive).to.be.false;
        });

        it("Should not allow non-seller to unlist NFT", async function () {
            const tokenId = 0;

            await expect(
                marketplace.connect(addr1).unlistNFT(tokenId)
            ).to.be.revertedWith("Not the seller");
        });
    });
}); 