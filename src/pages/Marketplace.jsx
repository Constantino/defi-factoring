import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Typography,
    Button,
    Stack,
} from '@mui/material';
import { ethers } from 'ethers';
import MarketplaceABI from '../contracts/artifacts/Marketplace.abi.json';
import InvoiceNFTABI from '../contracts/artifacts/InvoiceNFT.abi.json';
import CreditHandlerABI from '../contracts/artifacts/CreditHandler.abi.json';
import { useWallet } from '../context/WalletContext';

function Marketplace() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const { account } = useWallet();

    const appendPinataToken = (url) => {
        if (url && url.includes('mypinata.cloud')) {
            return `${url}?pinataGatewayToken=${import.meta.env.VITE_PINATA_GATEWAY_TOKEN}`;
        }
        return url;
    };

    const handleBuyNFT = async (tokenId, price) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const marketplaceContract = new ethers.Contract(
                import.meta.env.VITE_MARKETPLACE_ADDRESS,
                MarketplaceABI,
                signer
            );

            const nftContract = new ethers.Contract(
                import.meta.env.VITE_INVOICE_NFT_ADDRESS,
                InvoiceNFTABI,
                signer
            );

            const creditHandlerContract = new ethers.Contract(
                import.meta.env.VITE_CREDIT_HANDLER_ADDRESS,
                CreditHandlerABI,
                signer
            );

            // Convert price to wei
            const priceInWei = price.toString();
            console.log('Price in wei:', priceInWei.toString());

            // First check if the NFT is still listed
            const [seller, listingPrice, isActive] = await marketplaceContract.getListing(tokenId);
            if (!isActive) {
                throw new Error('This NFT is no longer listed for sale');
            }

            // Check if the price matches
            const listingPriceInWei = listingPrice.toString();
            const currentPriceInWei = priceInWei.toString();
            console.log('Comparing prices:', {
                listingPrice: listingPriceInWei,
                currentPrice: currentPriceInWei
            });

            if (listingPriceInWei !== currentPriceInWei) {
                throw new Error('The price has changed. Please refresh the page.');
            }

            // Get NFT metadata to extract dueBy date
            const tokenURI = await nftContract.tokenURI(tokenId);
            const metadataURI = appendPinataToken(tokenURI);
            const response = await fetch(metadataURI);
            const metadata = await response.json();

            // Convert dueBy date to Unix timestamp
            const dueByDate = new Date(metadata.attributes.dueBy);
            const dueByTimestamp = Math.floor(dueByDate.getTime() / 1000);
            console.log('Due by timestamp:', dueByTimestamp);

            // Estimate gas first
            console.log('Estimating gas...');
            const gasEstimate = await marketplaceContract.buyNFT.estimateGas(tokenId, {
                value: priceInWei
            });
            console.log('Estimated gas:', gasEstimate.toString());

            // Add 20% buffer to gas estimate
            const gasLimit = gasEstimate * 120n / 100n;
            console.log('Gas limit with buffer:', gasLimit.toString());

            // Call buyNFT function with the price in wei and gas limit
            console.log('Sending transaction...');
            const tx = await marketplaceContract.buyNFT(tokenId, {
                value: priceInWei,
                gasLimit: gasLimit
            });
            console.log('Transaction sent:', tx.hash);
            await tx.wait();
            console.log('Transaction confirmed');

            // Get current owner of the NFT
            const currentOwner = await nftContract.ownerOf(tokenId);
            console.log('Current NFT owner:', currentOwner);
            console.log('Signer address:', await signer.getAddress());

            // Approve CreditHandler to transfer the NFT
            console.log('Approving CreditHandler...');
            const approveTx = await nftContract.approve(import.meta.env.VITE_CREDIT_HANDLER_ADDRESS, tokenId);
            await approveTx.wait();
            console.log('CreditHandler approved');

            // Open credit in CreditHandler
            console.log('Opening credit...');
            const creditAmount = ethers.parseEther('0.001'); // 0.001 ETH

            // Log all parameters for debugging
            console.log('Credit parameters:', {
                lendee: seller,
                amount: creditAmount.toString(),
                dueBy: dueByTimestamp,
                tokenId: tokenId,
                creditHandlerAddress: import.meta.env.VITE_CREDIT_HANDLER_ADDRESS,
                currentOwner: currentOwner,
                signerAddress: await signer.getAddress()
            });

            try {
                // Check if the NFT is approved for the CreditHandler
                const isApproved = await nftContract.getApproved(tokenId);
                console.log('NFT approval status:', {
                    approvedAddress: isApproved,
                    creditHandlerAddress: import.meta.env.VITE_CREDIT_HANDLER_ADDRESS,
                    isApproved: isApproved.toLowerCase() === import.meta.env.VITE_CREDIT_HANDLER_ADDRESS.toLowerCase()
                });

                // First try to estimate gas for openCredit
                const openCreditGasEstimate = await creditHandlerContract.openCredit.estimateGas(
                    seller,
                    creditAmount,
                    dueByTimestamp,
                    tokenId
                );
                console.log('OpenCredit gas estimate:', openCreditGasEstimate.toString());

                // Add 20% buffer to gas estimate
                const openCreditGasLimit = openCreditGasEstimate * 120n / 100n;

                const openCreditTx = await creditHandlerContract.openCredit(
                    seller,
                    creditAmount,
                    dueByTimestamp,
                    tokenId,
                    {
                        gasLimit: openCreditGasLimit
                    }
                );
                console.log('OpenCredit transaction sent:', openCreditTx.hash);
                await openCreditTx.wait();
                console.log('Credit opened successfully');
            } catch (openCreditError) {
                console.error('Error in openCredit:', openCreditError);
                throw new Error(`Failed to open credit: ${openCreditError.message}`);
            }

            // Refresh the listings
            fetchListedNFTs();
        } catch (error) {
            console.error('Error buying NFT:', error);
            let errorMessage = 'Error buying NFT: ';

            if (error.message.includes('insufficient funds')) {
                errorMessage += 'Insufficient funds to complete the transaction';
            } else if (error.message.includes('user rejected')) {
                errorMessage += 'Transaction was rejected';
            } else if (error.message.includes('no longer listed')) {
                errorMessage += 'This NFT is no longer listed for sale';
            } else if (error.message.includes('price has changed')) {
                errorMessage += 'The price has changed. Please refresh the page.';
            } else if (error.message.includes('Internal JSON-RPC error')) {
                errorMessage += 'Transaction failed. Please check if you have enough ETH and try again.';
            } else if (error.message.includes('Failed to open credit')) {
                errorMessage += error.message;
            } else {
                errorMessage += error.message;
            }

            alert(errorMessage);
        }
    };

    const fetchListedNFTs = async () => {
        try {
            console.log('Initializing marketplace contract...');
            const provider = new ethers.BrowserProvider(window.ethereum);
            const marketplaceContract = new ethers.Contract(
                import.meta.env.VITE_MARKETPLACE_ADDRESS,
                MarketplaceABI,
                provider
            );

            const nftContract = new ethers.Contract(
                import.meta.env.VITE_INVOICE_NFT_ADDRESS,
                InvoiceNFTABI,
                provider
            );

            // Check first 100 token IDs for listings
            const listedNFTs = [];
            for (let i = 0; i < 100; i++) {
                try {
                    // Get listing details
                    const [seller, price, isActive] = await marketplaceContract.getListing(i);
                    console.log(`Token ${i} listing:`, { seller, price: price.toString(), isActive });

                    if (isActive) {
                        console.log(`Found active listing for token ${i}`);

                        // Get token URI
                        const tokenURI = await nftContract.tokenURI(i);
                        console.log(`Token ${i} URI:`, tokenURI);

                        // Append Pinata gateway token to the URI
                        const metadataURI = appendPinataToken(tokenURI);
                        console.log(`Token ${i} metadata URI:`, metadataURI);

                        // Fetch metadata
                        const response = await fetch(metadataURI);
                        const metadata = await response.json();
                        console.log(`Token ${i} metadata:`, metadata);

                        // Append Pinata token to image and PDF URLs
                        const processedMetadata = {
                            ...metadata,
                            image: appendPinataToken(metadata.image),
                            attributes: {
                                ...metadata.attributes,
                                pdfFile: appendPinataToken(metadata.attributes?.pdfFile)
                            }
                        };

                        listedNFTs.push({
                            tokenId: i.toString(),
                            ...processedMetadata,
                            listing: {
                                seller,
                                price: price.toString(),
                                isActive
                            }
                        });
                    }
                } catch (error) {
                    console.log(`Error checking token ${i}:`, error.message);
                    // Skip tokens that don't exist or other errors
                    continue;
                }
            }

            console.log('All listed NFTs:', listedNFTs);
            setInvoices(listedNFTs);
            setLoading(false);

        } catch (error) {
            console.error('Error fetching listed NFTs:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListedNFTs();
    }, [account]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatETH = (wei) => {
        return ethers.formatEther(wei) + ' ETH';
    };

    return (
        <Box sx={{
            paddingTop: '80px',
            paddingX: 2,
            minHeight: '100vh'
        }}>
            <Typography
                variant="h4"
                gutterBottom
                sx={{
                    color: 'white',
                    textAlign: 'center',
                    mb: 4,
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
            >
                Marketplace
            </Typography>

            {loading ? (
                <Typography
                    variant="h6"
                    sx={{
                        color: 'white',
                        textAlign: 'center'
                    }}
                >
                    Loading invoices...
                </Typography>
            ) : (
                <Grid
                    container
                    spacing={3}
                    sx={{
                        justifyContent: 'center',
                        alignItems: 'stretch'
                    }}
                >
                    {invoices.map((invoice) => (
                        <Grid item xs={12} sm={6} md={4} key={invoice.tokenId}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        transition: 'transform 0.2s ease-in-out',
                                        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.2)',
                                    }
                                }}
                            >
                                <Box sx={{
                                    height: 200,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    p: 2
                                }}>
                                    <CardMedia
                                        component="img"
                                        image={invoice.image}
                                        alt={invoice.name}
                                        sx={{
                                            height: '100%',
                                            width: 'auto',
                                            maxWidth: '100%',
                                            objectFit: 'contain'
                                        }}
                                    />
                                </Box>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{
                                            color: 'white',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {invoice.name} - {invoice.tokenId}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            mb: 2
                                        }}
                                    >
                                        {invoice.description}
                                    </Typography>
                                    <Stack spacing={1}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                            >
                                                Invoice Amount:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'white', fontWeight: 'bold' }}
                                            >
                                                {formatAmount(invoice.attributes.invoiceAmount)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                            >
                                                Credit Requested:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'white', fontWeight: 'bold' }}
                                            >
                                                {formatAmount(invoice.attributes.creditRequested)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                            >
                                                Due By:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'white', fontWeight: 'bold' }}
                                            >
                                                {formatDate(invoice.attributes.dueBy)}
                                            </Typography>
                                        </Box>
                                        {/* <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                            >
                                                Price:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'white', fontWeight: 'bold' }}
                                            >
                                                {formatETH(invoice.listing.price)}
                                            </Typography>
                                        </Box> */}
                                    </Stack>
                                    <Stack spacing={2} sx={{ mt: 2 }}>
                                        {invoice.attributes.pdfFile && (
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                onClick={() => window.open(invoice.attributes.pdfFile, '_blank')}
                                                sx={{
                                                    color: 'white',
                                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                                    '&:hover': {
                                                        borderColor: 'rgba(255, 255, 255, 0.3)',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                    }
                                                }}
                                            >
                                                View PDF
                                            </Button>
                                        )}
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            onClick={() => handleBuyNFT(invoice.tokenId, invoice.listing.price)}
                                            sx={{
                                                backgroundColor: '#4CAF50',
                                                '&:hover': {
                                                    backgroundColor: '#45a049',
                                                }
                                            }}
                                        >
                                            Buy Credit
                                        </Button>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}

export default Marketplace; 