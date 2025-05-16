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
import CreditHandlerABI from '../contracts/artifacts/CreditHandler.abi.json';
import InvoiceNFTABI from '../contracts/artifacts/InvoiceNFT.abi.json';
import { useWallet } from '../context/WalletContext';

function Credits() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const { account } = useWallet();

    const appendPinataToken = (url) => {
        if (url && url.includes('mypinata.cloud')) {
            return `${url}?pinataGatewayToken=${import.meta.env.VITE_PINATA_GATEWAY_TOKEN}`;
        }
        return url;
    };

    const fetchCredits = async () => {
        try {
            if (!account) {
                setLoading(false);
                return;
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const creditHandlerContract = new ethers.Contract(
                import.meta.env.VITE_CREDIT_HANDLER_ADDRESS,
                CreditHandlerABI,
                provider
            );

            const nftContract = new ethers.Contract(
                import.meta.env.VITE_INVOICE_NFT_ADDRESS,
                InvoiceNFTABI,
                provider
            );

            const credits = [];

            // Check first 100 credit IDs
            for (let i = 0; i < 100; i++) {
                try {
                    // Get credit details
                    const [lender, lendee, amount, dueBy, tokenId, isPaid] = await creditHandlerContract.getCredit(i);

                    // Only process credits where the connected account is the lendee
                    if (lendee.toLowerCase() === account.toLowerCase() && !isPaid) {
                        console.log(`Found credit for token ${tokenId}:`, {
                            lender,
                            lendee,
                            amount: amount.toString(),
                            dueBy: dueBy.toString(),
                            isPaid
                        });

                        // Get token URI
                        const tokenURI = await nftContract.tokenURI(tokenId);
                        const metadataURI = appendPinataToken(tokenURI);

                        // Fetch metadata
                        const response = await fetch(metadataURI);
                        const metadata = await response.json();
                        console.log(`Token ${tokenId} metadata:`, metadata);

                        // Append Pinata token to image and PDF URLs
                        const processedMetadata = {
                            ...metadata,
                            image: appendPinataToken(metadata.image),
                            attributes: {
                                ...metadata.attributes,
                                pdfFile: appendPinataToken(metadata.attributes?.pdfFile)
                            }
                        };

                        credits.push({
                            creditId: i,
                            tokenId: tokenId.toString(),
                            ...processedMetadata,
                            credit: {
                                lender,
                                amount: amount.toString(),
                                dueBy: dueBy.toString(),
                                isPaid
                            }
                        });
                    }
                } catch (error) {
                    console.log(`Error checking credit ${i}:`, error.message);
                    // Skip credits that don't exist or other errors
                    continue;
                }
            }

            console.log('All credits:', credits);
            setInvoices(credits);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching credits:', error);
            setLoading(false);
        }
    };

    const handlePayCredit = async (creditId, amount) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const creditHandlerContract = new ethers.Contract(
                import.meta.env.VITE_CREDIT_HANDLER_ADDRESS,
                CreditHandlerABI,
                signer
            );

            console.log('Paying credit:', {
                creditId,
                amount: amount.toString()
            });

            // Estimate gas first
            const gasEstimate = await creditHandlerContract.payCredit.estimateGas(creditId, {
                value: amount
            });
            console.log('Estimated gas:', gasEstimate.toString());

            // Add 20% buffer to gas estimate
            const gasLimit = gasEstimate * 120n / 100n;

            // Send transaction
            const tx = await creditHandlerContract.payCredit(creditId, {
                value: amount,
                gasLimit: gasLimit
            });
            console.log('Transaction sent:', tx.hash);
            await tx.wait();
            console.log('Credit paid successfully');

            // Refresh credits
            fetchCredits();
        } catch (error) {
            console.error('Error paying credit:', error);
            let errorMessage = 'Error paying credit: ';

            if (error.message.includes('insufficient funds')) {
                errorMessage += 'Insufficient funds to complete the transaction';
            } else if (error.message.includes('user rejected')) {
                errorMessage += 'Transaction was rejected';
            } else if (error.message.includes('Internal JSON-RPC error')) {
                errorMessage += 'Transaction failed. Please check if you have enough ETH and try again.';
            } else {
                errorMessage += error.message;
            }

            alert(errorMessage);
        }
    };

    useEffect(() => {
        fetchCredits();
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
                Your Credits
            </Typography>

            {loading ? (
                <Typography
                    variant="h6"
                    sx={{
                        color: 'white',
                        textAlign: 'center'
                    }}
                >
                    Loading credits...
                </Typography>
            ) : invoices.length === 0 ? (
                <Typography
                    variant="h6"
                    sx={{
                        color: 'white',
                        textAlign: 'center'
                    }}
                >
                    No credits found
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
                                        {/* <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                            >
                                                Credit Amount:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'white', fontWeight: 'bold' }}
                                            >
                                                {formatETH(invoice.credit.amount)}
                                            </Typography>
                                        </Box> */}
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
                                                {formatDate(new Date(Number(invoice.credit.dueBy) * 1000))}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                            >
                                                Lender:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'white', fontWeight: 'bold' }}
                                            >
                                                {invoice.credit.lender.slice(0, 6)}...{invoice.credit.lender.slice(-4)}
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
                                            onClick={() => handlePayCredit(invoice.creditId, invoice.credit.amount)}
                                            sx={{
                                                backgroundColor: '#4CAF50',
                                                '&:hover': {
                                                    backgroundColor: '#45a049',
                                                }
                                            }}
                                        >
                                            Pay Credit
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

export default Credits; 