import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { useWallet } from './context/WalletContext';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from './assets/defi-factoring-logo.png';

const pages = [
    { name: 'Issuer', path: '/issuer' },
    { name: 'Viewer', path: '/viewer' },
    { name: 'Marketplace', path: '/marketplace' },
    { name: 'Factor', path: '/factor' },
    { name: 'Credits', path: '/credits' }
];

function ResponsiveAppBar() {
    const [anchorElNav, setAnchorElNav] = React.useState(null);
    const { account, isConnecting, connectWallet, disconnectWallet } = useWallet();
    const navigate = useNavigate();
    const location = useLocation();

    const handleOpenNavMenu = (event) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };

    const handleNavigation = (path) => {
        navigate(path);
        handleCloseNavMenu();
    };

    const formatAddress = (address) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <AppBar
            position="fixed"
            sx={{
                backgroundColor: 'rgba(10, 10, 10, 0.3) !important',
                backdropFilter: 'blur(20px) !important',
                WebkitBackdropFilter: 'blur(20px) !important',
                boxShadow: 'none',
                top: 0,
                left: 0,
                right: 0,
                '& .MuiToolbar-root': {
                    backgroundColor: 'transparent',
                }
            }}
        >
            <Container maxWidth="xl">
                <Toolbar disableGutters sx={{ backgroundColor: 'transparent' }}>
                    <Box
                        onClick={() => navigate('/')}
                        sx={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            '&:hover': {
                                opacity: 0.8
                            }
                        }}
                    >
                        <img
                            src={logo}
                            alt="DeFi Factoring"
                            style={{
                                width: '50px',
                                height: '50px',
                                transition: 'opacity 0.2s ease-in-out'
                            }}
                        />
                    </Box>

                    <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
                        <IconButton
                            size="large"
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleOpenNavMenu}
                            color="inherit"
                        >
                            <MenuIcon />
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorElNav}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            open={Boolean(anchorElNav)}
                            onClose={handleCloseNavMenu}
                            sx={{ display: { xs: 'block', md: 'none' } }}
                        >
                            {pages.map((page) => (
                                <MenuItem key={page.name} onClick={() => handleNavigation(page.path)}>
                                    <Typography sx={{ textAlign: 'center' }}>{page.name}</Typography>
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>

                    <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                        {pages.map((page) => (
                            <Button
                                key={page.name}
                                onClick={() => handleNavigation(page.path)}
                                sx={{
                                    my: 2,
                                    color: 'white',
                                    display: 'block',
                                    backgroundColor: location.pathname === page.path ? 'rgba(0, 255, 0, 0.1)' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 255, 0, 0.1)',
                                    }
                                }}
                            >
                                {page.name}
                            </Button>
                        ))}
                    </Box>

                    <Box sx={{ flexGrow: 0 }}>
                        {account ? (
                            <Tooltip title="Click to disconnect" placement="bottom">
                                <Button
                                    onClick={disconnectWallet}
                                    sx={{
                                        color: 'white',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 255, 0, 0.1)',
                                            border: '1px solid rgba(0, 255, 0, 0.3)',
                                        }
                                    }}
                                >
                                    {formatAddress(account)}
                                </Button>
                            </Tooltip>
                        ) : (
                            <Button
                                onClick={connectWallet}
                                disabled={isConnecting}
                                sx={{
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 255, 0, 0.1)',
                                        border: '1px solid rgba(0, 255, 0, 0.3)',
                                    },
                                    '&.Mui-disabled': {
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }
                                }}
                            >
                                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                            </Button>
                        )}
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}

export default ResponsiveAppBar;
