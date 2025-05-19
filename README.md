# DeFi Factoring

## Introduction

DeFi Factoring is a decentralized finance (DeFi) solution that revolutionizes traditional invoice factoring by leveraging blockchain technology and NFTs. This platform enables businesses to tokenize their accounts receivable into NFTs, providing immediate liquidity while maintaining transparency and security through smart contracts.

[Live Demo](https://defi-factoring.netlify.app/) | [Video Demo](https://youtu.be/aY-QmpCkzwU)

### What is DeFi Factoring?

DeFi Factoring combines traditional invoice factoring with decentralized finance principles:
- **Tokenization**: Convert invoices into NFTs with embedded metadata
- **Automated Credit Calculation**: Smart contracts calculate maximum credit amounts and interest rates
- **Decentralized Marketplace**: Open marketplace for factors to purchase invoice NFTs
- **Automated Credit Management**: Smart contracts handle credit creation and repayment
- **Transparent Ownership**: Clear tracking of invoice NFT ownership through blockchain

## Project Structure

The project consists of three main smart contracts and a React frontend:

### Smart Contracts (`/contracts/src/`)

### Deployed Contracts (Mantle Sepolia Testnet)

- **InvoiceNFT**: [`0x7Dbb278E573A8f09eb97144E8a039737e87fBCD5`](https://sepolia.mantlescan.xyz/address/0x7Dbb278E573A8f09eb97144E8a039737e87fBCD5)
- **Marketplace**: [`0xF2f3e5924AdEbc8adACB19247fA963D9a5b0f668`](https://sepolia.mantlescan.xyz/address/0xF2f3e5924AdEbc8adACB19247fA963D9a5b0f668)
- **CreditHandler**: [`0xE63c0EAd7EdF488ACc91b8455594B7C1016B0185`](https://sepolia.mantlescan.xyz/address/0xE63c0EAd7EdF488ACc91b8455594B7C1016B0185)


1. **InvoiceNFT.sol**
   - ERC721 token contract for invoice NFTs
   - Handles minting of new invoice NFTs
   - Stores invoice metadata on-chain
   - Manages NFT ownership and transfers

2. **Marketplace.sol**
   - Manages the listing and purchase of invoice NFTs
   - Handles price discovery and transactions
   - Integrates with InvoiceNFT for ownership transfers
   - Provides listing status and price information

3. **CreditHandler.sol**
   - Manages credit creation and repayment
   - Tracks credit terms and due dates
   - Handles automatic NFT transfers upon payment
   - Maintains credit status and payment records

### Frontend (`/src/`)

- **Pages**:
  - `Issuer.jsx`: Interface for companies to create and manage invoice NFTs
  - `Marketplace.jsx`: Platform for factors to browse and purchase invoice NFTs
  - `Credits.jsx`: Credit management interface for companies
  - `Viewer.jsx`: NFT viewing interface for all users

## Application Flow

1. **Invoice Creation (Issuer)**
   - Company creates an invoice NFT with details
   - System automatically calculates maximum credit amount (80% of invoice value)
   - Calculates interest based on 10% annual rate
   - NFT is minted and automatically listed in marketplace

2. **Marketplace (Factor)**
   - Factors can browse available invoice NFTs
   - View detailed invoice information and PDF documents
   - Purchase invoice NFTs to provide liquidity
   - Credit is automatically created upon purchase

3. **Credit Management (Issuer)**
   - Companies can view their active credits
   - Make payments before due date
   - NFT automatically returns to company upon successful payment
   - If payment is missed, NFT remains with factor

4. **NFT Ownership**
   - NFT ownership is tracked on blockchain
   - Transparent transfer of ownership
   - Automatic handling of NFT transfers based on payment status

## Technical Features

- **Smart Contract Integration**: Seamless interaction between NFTs, marketplace, and credit handling
- **Automated Calculations**: Interest and credit limits calculated on-chain
- **Secure Transactions**: All financial operations handled through smart contracts
- **Transparent Process**: All transactions and ownership changes recorded on blockchain
- **User-Friendly Interface**: Intuitive UI for all user roles

## Getting Started

```shell
# Install dependencies
npm install

# Run local development
npm run dev

# Deploy contracts
npx hardhat run scripts/deploy.js --network <network>
```

## Testing

```shell
# Run tests
npx hardhat test

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
