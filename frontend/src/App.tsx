import React, { useState, useCallback, useMemo } from 'react';
import { UploadPage } from './components/UploadPage';
import { BrowsePage } from './components/BrowsePage';
import { VerifyPage } from './components/VerifyPage';

/** Navigation tab identifiers. */
type TabId = 'upload' | 'browse' | 'verify';

/** Tab configuration. */
interface TabConfig {
    readonly id: TabId;
    readonly label: string;
    readonly icon: string;
}

const TABS: readonly TabConfig[] = [
    { id: 'upload', label: 'Upload', icon: '\u2B06' },
    { id: 'browse', label: 'Browse', icon: '\uD83D\uDCC2' },
    { id: 'verify', label: 'Verify', icon: '\u2705' },
];

/** Trend images for floating background collage. */
const TREND_IMAGES: readonly string[] = [
    './bg/gaming.jpg',
    './bg/retro-tech.jpg',
    './bg/anime.jpg',
    './bg/sneakers.jpg',
    './bg/esports.jpg',
    './bg/abstract.jpg',
];

/** Floating image props. */
interface FloatImageProps {
    readonly src: string;
    readonly index: number;
}

/** Single floating trend image in background. */
function FloatImage({ src, index }: FloatImageProps): React.JSX.Element {
    const style: React.CSSProperties = useMemo((): React.CSSProperties => {
        const positions: readonly { x: number; y: number }[] = [
            { x: 5, y: 8 },
            { x: 70, y: 5 },
            { x: 85, y: 45 },
            { x: 10, y: 55 },
            { x: 55, y: 70 },
            { x: 30, y: 85 },
        ];
        const pos = positions[index % positions.length];
        return {
            position: 'absolute' as const,
            left: `${pos?.x ?? 0}%`,
            top: `${pos?.y ?? 0}%`,
            width: `${140 + (index % 3) * 30}px`,
            height: `${140 + (index % 3) * 30}px`,
            borderRadius: '16px',
            objectFit: 'cover' as const,
            opacity: 0.12,
            filter: 'saturate(1.3) brightness(0.8)',
            animation: `floatDrift${index % 3} ${18 + index * 3}s ease-in-out infinite`,
            animationDelay: `${index * 2}s`,
            pointerEvents: 'none' as const,
            transform: `rotate(${-8 + index * 5}deg)`,
            boxShadow: '0 0 40px rgba(191, 95, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
        };
    }, [index]);

    return <img src={src} alt="" style={style} loading="lazy" />;
}

/**
 * Root application component.
 * Provides wallet connection and tab navigation with animated background.
 */
export function App(): React.JSX.Element {
    const [activeTab, setActiveTab] = useState<TabId>('upload');
    const [walletAddress, setWalletAddress] = useState<string>('');

    const handleConnect = useCallback((): void => {
        setWalletAddress('bcrt1p...connected');
    }, []);

    const truncateAddress = useCallback((address: string): string => {
        if (address.length <= 16) {
            return address;
        }
        return `${address.slice(0, 8)}...${address.slice(-6)}`;
    }, []);

    const renderPage = useCallback((): React.JSX.Element => {
        switch (activeTab) {
            case 'upload':
                return <UploadPage walletAddress={walletAddress} />;
            case 'browse':
                return <BrowsePage />;
            case 'verify':
                return <VerifyPage />;
        }
    }, [activeTab, walletAddress]);

    return (
        <>
            <div className="bg-grid" />
            <div className="bg-floaters">
                {TREND_IMAGES.map((src: string, i: number): React.JSX.Element => (
                    <FloatImage key={i} src={src} index={i} />
                ))}
            </div>

            <div className="app-container">
                <header className="header">
                    <div>
                        <div className="header-title">OP_Scribe</div>
                        <div className="header-subtitle">
                            proof of file existence on Bitcoin L1 &middot;{' '}
                            <span className="tag tag-btc">BTC</span>{' '}
                            <span className="tag tag-ipfs">IPFS</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={`wallet-btn ${walletAddress ? 'connected' : ''}`}
                        onClick={handleConnect}
                    >
                        {walletAddress ? truncateAddress(walletAddress) : 'Connect Wallet'}
                    </button>
                </header>

                <nav className="nav">
                    {TABS.map((tab: TabConfig): React.JSX.Element => (
                        <button
                            key={tab.id}
                            type="button"
                            className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={(): void => setActiveTab(tab.id)}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>

                <main>{renderPage()}</main>

                <footer className="footer">
                    OP_Scribe &middot; Powered by OPNet &middot; Bitcoin L1
                </footer>
            </div>
        </>
    );
}
