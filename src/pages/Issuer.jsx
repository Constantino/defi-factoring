import React, { useState, useContext } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Stack,
    Paper,
} from '@mui/material';
import { PinataSDK } from "pinata";
import { ethers } from 'ethers';
import InvoiceNFTABI from '../contracts/artifacts/InvoiceNFT.abi.json';
import MarketplaceABI from '../contracts/artifacts/Marketplace.abi.json';
import logoImage from '../assets/defi-factoring-logo.png';
import { useWallet } from '../context/WalletContext';

function Issuer() {
    const { account, connectWallet, isConnected } = useWallet();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        invoiceAmount: '',
        creditRequested: '',
        dueBy: '',
        pdfFile: null
    });

    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const mint = async (addressAccount, uri) => {
        try {
            console.log('Initializing ethers provider...');
            const provider = new ethers.BrowserProvider(window.ethereum);
            console.log('Getting signer...');
            const signer = await provider.getSigner();
            console.log('Creating contract instance...');
            const contract = new ethers.Contract(
                import.meta.env.VITE_INVOICE_NFT_ADDRESS,
                InvoiceNFTABI,
                signer
            );

            console.log('Calling safeMint...');
            const tx = await contract.safeMint(addressAccount, uri);
            console.log('Waiting for transaction...');
            const receipt = await tx.wait();
            console.log("Mint successful:", receipt);

            // Get the token ID from the Transfer event
            const transferEvent = receipt.logs.find(
                log => log.fragment && log.fragment.name === 'Transfer'
            );
            const tokenId = transferEvent ? transferEvent.args[2].toString() : null;
            console.log('Minted token ID:', tokenId);

            return { receipt, tokenId };

        } catch (error) {
            console.error("Mint failed:", error);
            throw error;
        }
    };

    const listInMarketplace = async (tokenId) => {
        try {
            console.log('Initializing marketplace contract...');
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const marketplaceContract = new ethers.Contract(
                import.meta.env.VITE_MARKETPLACE_ADDRESS,
                MarketplaceABI,
                signer
            );

            // First approve the marketplace to transfer the NFT
            console.log('Approving marketplace to transfer NFT...');
            const nftContract = new ethers.Contract(
                import.meta.env.VITE_INVOICE_NFT_ADDRESS,
                InvoiceNFTABI,
                signer
            );
            const approveTx = await nftContract.approve(
                import.meta.env.VITE_MARKETPLACE_ADDRESS,
                tokenId
            );
            await approveTx.wait();
            console.log('Marketplace approved to transfer NFT');

            // List the NFT in the marketplace
            console.log('Listing NFT in marketplace...');
            const listTx = await marketplaceContract.listNFT(
                tokenId,
                ethers.parseEther('0.0001') // Fixed price of 0.0001 ETH
            );
            await listTx.wait();
            console.log('NFT listed successfully in marketplace');

        } catch (error) {
            console.error('Error listing NFT in marketplace:', error);
            throw error;
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setFormData(prev => ({
                ...prev,
                pdfFile: file
            }));
        } else {
            alert('Please upload a PDF file');
        }
    };

    const handleMint = async () => {
        console.log('Starting mint process...');
        console.log('Wallet state:', { isConnected, account });

        // Check if we have an account but isConnected is undefined
        if (account && !isConnected) {
            console.log('Account exists but isConnected is undefined, proceeding with mint...');
        } else if (!account) {
            console.log('No account found, attempting to connect wallet...');
            await connectWallet();
            return;
        }

        try {
            setIsLoading(true);
            console.log('Initializing Pinata...');

            // Initialize Pinata
            const pinata = new PinataSDK({
                pinataJwt: import.meta.env.VITE_PINATA_JWT,
                pinataGateway: import.meta.env.VITE_PINATA_GATEWAY_URL,
            });
            console.log('Pinata initialized successfully');

            // Upload logo image
            const logoUrl = 'https://aqua-hard-reptile-893.mypinata.cloud/ipfs/bafybeiboyci4pn74ndnh5qapor6hczongyurmoiz6kcjypw3z5pkzazsby'

            // Upload PDF file if exists
            let pdfUrl = null;
            if (formData.pdfFile) {
                console.log('Uploading PDF file...');
                const pdfUpload = await pinata.upload.public.file(formData.pdfFile);
                const pdfCid = pdfUpload.cid;
                pdfUrl = `${import.meta.env.VITE_PINATA_GATEWAY_URL_IPFS}${pdfCid}`;
                console.log('PDF uploaded successfully:', { pdfCid, pdfUrl });
            } else {
                console.log('No PDF file to upload');
            }

            // Create metadata
            console.log('Creating metadata...');
            const metadata = {
                name: formData.name,
                description: formData.description,
                image: logoUrl,
                attributes: {
                    invoiceAmount: formData.invoiceAmount,
                    creditRequested: formData.creditRequested,
                    dueBy: formData.dueBy,
                    pdfFile: pdfUrl
                }
            };
            console.log('Metadata created:', metadata);

            // Upload metadata
            console.log('Uploading metadata to IPFS...');
            const metadataUpload = await pinata.upload.public.json(metadata);
            const metadataCid = metadataUpload.cid;
            const metadataUrl = `${import.meta.env.VITE_PINATA_GATEWAY_URL_IPFS}${metadataCid}`;
            console.log('Metadata uploaded successfully:', { metadataCid, metadataUrl });

            // Mint NFT using connected account
            console.log('Starting NFT minting process...');
            console.log('Minting to address:', account);
            console.log('Using metadata URL:', metadataUrl);
            const { tokenId } = await mint(account, metadataUrl);
            console.log('NFT minted successfully with token ID:', tokenId);

            // List NFT in marketplace
            console.log('Listing NFT in marketplace...');
            await listInMarketplace(tokenId);
            console.log('NFT listed in marketplace successfully');

            // Reset form
            console.log('Resetting form...');
            setFormData({
                name: '',
                description: '',
                invoiceAmount: '',
                creditRequested: '',
                dueBy: '',
                pdfFile: null
            });
            console.log('Form reset complete');

            alert('Invoice NFT minted and listed successfully!');

        } catch (error) {
            console.error('Error in mint process:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            alert('Failed to mint or list invoice. Please try again.');
        } finally {
            setIsLoading(false);
            console.log('Mint process completed');
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 4,
                maxWidth: 600,
                mx: 'auto',
                mt: '80px',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            }}
        >
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
                Create New Invoice
            </Typography>
            <Stack spacing={3}>
                <TextField
                    fullWidth
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '8px',
                            '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            '&:hover fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                            },
                        },
                        '& .MuiInputLabel-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                        },
                        '& .MuiInputBase-input': {
                            color: 'white',
                        },
                    }}
                />
                <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    multiline
                    rows={4}
                    required
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '8px',
                            '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            '&:hover fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                            },
                        },
                        '& .MuiInputLabel-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                        },
                        '& .MuiInputBase-input': {
                            color: 'white',
                        },
                    }}
                />
                <TextField
                    fullWidth
                    label="Invoice Amount"
                    name="invoiceAmount"
                    type="number"
                    value={formData.invoiceAmount}
                    onChange={handleInputChange}
                    required
                    InputProps={{
                        startAdornment: '$'
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '8px',
                            '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            '&:hover fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                            },
                        },
                        '& .MuiInputLabel-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                        },
                        '& .MuiInputBase-input': {
                            color: 'white',
                        },
                    }}
                />
                <TextField
                    fullWidth
                    label="Credit Requested"
                    name="creditRequested"
                    type="number"
                    value={formData.creditRequested}
                    onChange={handleInputChange}
                    required
                    InputProps={{
                        startAdornment: '$'
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '8px',
                            '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            '&:hover fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                            },
                        },
                        '& .MuiInputLabel-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                        },
                        '& .MuiInputBase-input': {
                            color: 'white',
                        },
                    }}
                />
                <TextField
                    fullWidth
                    label="Due By"
                    name="dueBy"
                    type="date"
                    value={formData.dueBy}
                    onChange={handleInputChange}
                    required
                    InputLabelProps={{
                        shrink: true,
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '8px',
                            '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            '&:hover fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                            },
                        },
                        '& .MuiInputLabel-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                        },
                        '& .MuiInputBase-input': {
                            color: 'white',
                        },
                    }}
                />
                <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    sx={{
                        color: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        '&:hover': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        },
                        py: 1.5,
                    }}
                >
                    Attach PDF File
                    <input
                        type="file"
                        hidden
                        accept=".pdf"
                        onChange={handleFileChange}
                    />
                </Button>
                {formData.pdfFile && (
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            textAlign: 'center',
                        }}
                    >
                        Selected file: {formData.pdfFile.name}
                    </Typography>
                )}
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleMint}
                    fullWidth
                    disabled={isLoading}
                    sx={{
                        background: 'linear-gradient(45deg, #1B5E20 30%, #2E7D32 90%)',
                        color: 'white',
                        py: 1.5,
                        '&:hover': {
                            background: 'linear-gradient(45deg, #0D3B13 30%, #1B5E20 90%)',
                        },
                        '&.Mui-disabled': {
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.3)',
                        }
                    }}
                >
                    {isLoading ? 'Minting...' : isConnected ? 'Mint Invoice' : 'Connect Wallet'}
                </Button>
            </Stack>
        </Paper>
    );
}

export default Issuer; 