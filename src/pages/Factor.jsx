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
import InvoiceNFTABI from '../contracts/artifacts/InvoiceNFT.abi.json';
import { useWallet } from '../context/WalletContext';

function Factor() {
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
        const fetchNFTs = async () => {
            if (!account) {
                console.log('No account connected');
                setLoading(false);
                return;
            }

            try {
                console.log('Fetching NFTs for account:', account);
                const provider = new ethers.BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(
                    import.meta.env.VITE_INVOICE_NFT_ADDRESS,
                    InvoiceNFTABI,
                    provider
                );

                const fetchedInvoices = [];

                // Check first 100 token IDs for ownership
                for (let i = 0; i < 100; i++) {
                    try {
                        // Get owner of token ID
                        const owner = await contract.ownerOf(i);

                        // If the current account owns this token
                        if (owner.toLowerCase() === account.toLowerCase()) {
                            console.log('Found owned token ID:', i);

                            // Get token URI
                            const tokenURI = await contract.tokenURI(i);
                            console.log('Token URI:', tokenURI);

                            // Append Pinata gateway token to the URI
                            const metadataURI = appendPinataToken(tokenURI);
                            console.log('Metadata URI with gateway token:', metadataURI);

                            // Fetch metadata from IPFS
                            const response = await fetch(metadataURI);
                            const metadata = await response.json();
                            console.log('Metadata for token', i, ':', metadata);

                            // Add to fetched invoices using the metadata directly
                            fetchedInvoices.push({
                                tokenId: i.toString(),
                                ...metadata,
                                image: appendPinataToken(metadata.image),
                                pdfUrl: appendPinataToken(metadata.pdfUrl)
                            });
                        }
                    } catch (error) {
                        // Skip tokens that don't exist or other errors
                        continue;
                    }
                }

                console.log('Fetched invoices:', fetchedInvoices);
                setInvoices(fetchedInvoices);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching NFTs:', error);
                setLoading(false);
            }
        };

        fetchNFTs();
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
                Your Invoice NFTs
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
            ) : invoices.length === 0 ? (
                <Typography
                    variant="h6"
                    sx={{
                        color: 'white',
                        textAlign: 'center'
                    }}
                >
                    No invoices found
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
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                            >
                                                Interest Rate:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'white', fontWeight: 'bold' }}
                                            >
                                                {invoice.attributes.interestRate}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                            >
                                                Interest Amount:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'white', fontWeight: 'bold' }}
                                            >
                                                {formatAmount(invoice.attributes.interestAmount)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            mt: 1,
                                            pt: 1,
                                            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 'bold' }}
                                            >
                                                Total Amount to Pay:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'white', fontWeight: 'bold' }}
                                            >
                                                {formatAmount(invoice.attributes.totalAmountToPay)}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    {invoice.attributes.pdfFile && (
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            onClick={() => window.open(`${invoice.attributes.pdfFile}?pinataGatewayToken=${import.meta.env.VITE_PINATA_GATEWAY_TOKEN}`, '_blank')}
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

export default Factor; 