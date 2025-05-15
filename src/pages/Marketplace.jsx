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

    useEffect(() => {
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
                                        {invoice.name}
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
                                    </Stack>
                                    {invoice.attributes.pdfFile && (
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            onClick={() => window.open(invoice.attributes.pdfFile, '_blank')}
                                            sx={{
                                                mt: 2,
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