const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CreditHandler", function () {
    let creditHandler;
    let invoiceNFT;
    let owner;
    let lender;
    let lendee;
    let addr1;

    beforeEach(async function () {
        [owner, lender, lendee, addr1] = await ethers.getSigners();

        // Deploy InvoiceNFT
        const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
        invoiceNFT = await InvoiceNFT.deploy(owner.address);
        await invoiceNFT.waitForDeployment();

        // Deploy CreditHandler
        const CreditHandler = await ethers.getContractFactory("CreditHandler");
        creditHandler = await CreditHandler.deploy(await invoiceNFT.getAddress());
        await creditHandler.waitForDeployment();

        // Mint an NFT to lendee
        await invoiceNFT.safeMint(lendee.address, "ipfs://QmTest123");
    });

    describe("Credit Opening", function () {
        it("Should allow opening credit", async function () {
            const tokenId = 0;
            const amount = ethers.parseEther("1.0");
            const dueBy = Math.floor(Date.now() / 1000) + 86400; // 1 day from now

            // Approve credit handler
            await invoiceNFT.connect(lendee).approve(await creditHandler.getAddress(), tokenId);

            // Open credit
            await creditHandler.connect(lender).openCredit(lendee.address, amount, dueBy, tokenId);

            const credit = await creditHandler.credits(0);
            expect(credit.lender).to.equal(lender.address);
            expect(credit.lendee).to.equal(lendee.address);
            expect(credit.amountOfCredit).to.equal(amount);
            expect(credit.dueBy).to.equal(dueBy);
            expect(credit.isPaid).to.be.false;
        });

        it("Should not allow opening credit for non-existent NFT", async function () {
            const tokenId = 999;
            const amount = ethers.parseEther("1.0");
            const dueBy = Math.floor(Date.now() / 1000) + 86400;

            await expect(
                creditHandler.connect(lender).openCredit(lendee.address, amount, dueBy, tokenId)
            ).to.be.revertedWithCustomError(invoiceNFT, "ERC721NonexistentToken");
        });
    });

    describe("Credit Payment", function () {
        beforeEach(async function () {
            const tokenId = 0;
            const amount = ethers.parseEther("1.0");
            const dueBy = Math.floor(Date.now() / 1000) + 86400;

            // Approve and open credit
            await invoiceNFT.connect(lendee).approve(await creditHandler.getAddress(), tokenId);
            await creditHandler.connect(lender).openCredit(lendee.address, amount, dueBy, tokenId);
        });

        it("Should allow paying credit", async function () {
            const creditId = 0;
            const amount = ethers.parseEther("1.0");

            await creditHandler.connect(lendee).payCredit(creditId, { value: amount });

            const credit = await creditHandler.credits(creditId);
            expect(credit.isPaid).to.be.true;
        });

        it("Should not allow paying with wrong amount", async function () {
            const creditId = 0;
            const wrongAmount = ethers.parseEther("0.5");

            await expect(
                creditHandler.connect(lendee).payCredit(creditId, { value: wrongAmount })
            ).to.be.revertedWith("Insufficient payment");
        });

        it("Should not allow paying already paid credit", async function () {
            const creditId = 0;
            const amount = ethers.parseEther("1.0");

            // Pay credit first
            await creditHandler.connect(lendee).payCredit(creditId, { value: amount });

            // Try to pay again
            await expect(
                creditHandler.connect(lendee).payCredit(creditId, { value: amount })
            ).to.be.revertedWith("Credit already paid");
        });
    });
}); 