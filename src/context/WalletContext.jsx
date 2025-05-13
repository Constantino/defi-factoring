import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const WalletContext = createContext();

export function WalletProvider({ children }) {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        // Check if wallet is already connected
        checkIfWalletIsConnected();
    }, []);

    const checkIfWalletIsConnected = async () => {
        try {
            if (!window.ethereum) {
                console.log("Please install MetaMask!");
                return;
            }

            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                setProvider(provider);
                setAccount(accounts[0]);
            }
        } catch (error) {
            console.log("Error checking wallet connection:", error);
        }
    };

    const connectWallet = async () => {
        try {
            setIsConnecting(true);
            if (!window.ethereum) {
                alert("Please install MetaMask!");
                return;
            }

            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            const provider = new ethers.BrowserProvider(window.ethereum);
            setProvider(provider);
            setAccount(accounts[0]);
        } catch (error) {
            console.log("Error connecting wallet:", error);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setProvider(null);
    };

    return (
        <WalletContext.Provider value={{
            account,
            provider,
            isConnecting,
            connectWallet,
            disconnectWallet
        }}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
} 