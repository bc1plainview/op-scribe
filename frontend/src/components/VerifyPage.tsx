import React, { useState, useCallback } from 'react';

/** Verification result from the contract. */
interface VerificationResult {
    readonly exists: boolean;
    readonly fileName: string;
    readonly fileSize: string;
    readonly uploader: string;
    readonly blockNumber: string;
    readonly timestamp: string;
}

/**
 * Verify page -- check if a file CID has been registered on-chain.
 *
 * @returns JSX element for the verification page.
 */
export function VerifyPage(): React.JSX.Element {
    const [cidInput, setCidInput] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleVerify = useCallback(async (): Promise<void> => {
        const trimmedCid: string = cidInput.trim();
        if (trimmedCid.length === 0) {
            setErrorMessage('Please enter a CID to verify.');
            return;
        }

        setLoading(true);
        setResult(null);
        setErrorMessage('');

        try {
            // NOTE: Contract interaction requires deployment.
            // Once deployed, use:
            //
            // const provider = new JSONRpcProvider(OPNET_RPC_URL, networks.regtest);
            // const contract = getContract<IOPScribeContract>(...);
            // const fileResult = await contract.getFile(trimmedCid);
            // const decoded = fileResult.decoded;
            //
            // setResult({
            //     exists: decoded.exists,
            //     fileName: decoded.fileName,
            //     fileSize: formatBytes(decoded.fileSize),
            //     uploader: `0x${decoded.uploader.toString(16)}`,
            //     blockNumber: decoded.blockNumber.toString(),
            //     timestamp: new Date(Number(decoded.timestamp) * 1000).toISOString(),
            // });

            // Placeholder until contract deployment
            setResult({
                exists: false,
                fileName: '',
                fileSize: '0',
                uploader: '',
                blockNumber: '0',
                timestamp: '',
            });
        } catch (err: unknown) {
            const message: string = err instanceof Error ? err.message : 'Verification failed';
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    }, [cidInput]);

    return (
        <div className="card">
            <div className="card-title">Verify File Proof</div>

            <div className="input-group">
                <label className="input-label" htmlFor="cid-input">
                    IPFS Content Identifier (CID)
                </label>
                <input
                    id="cid-input"
                    className="input"
                    type="text"
                    placeholder="QmXoYp... or bafy..."
                    value={cidInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                        setCidInput(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent): void => {
                        if (e.key === 'Enter') {
                            handleVerify().catch((): undefined => undefined);
                        }
                    }}
                />
            </div>

            <button
                type="button"
                className="btn btn-primary btn-full"
                disabled={loading || cidInput.trim().length === 0}
                onClick={(): void => {
                    handleVerify().catch((): undefined => undefined);
                }}
            >
                {loading ? (
                    <>
                        <span className="spinner" /> Verifying...
                    </>
                ) : (
                    'Verify on Chain'
                )}
            </button>

            {errorMessage && <div className="status status-error">{errorMessage}</div>}

            {result && !result.exists && !errorMessage && (
                <div className="status status-error">
                    No on-chain proof found for this CID.
                    {' '}(Contract deployment pending -- verification will work after deployment.)
                </div>
            )}

            {result && result.exists && (
                <div className="verify-result">
                    <div className="status status-success" style={{ marginBottom: '16px' }}>
                        On-chain proof verified.
                    </div>

                    <div className="verify-field">
                        <span className="verify-label">File Name</span>
                        <span className="verify-value">{result.fileName}</span>
                    </div>
                    <div className="verify-field">
                        <span className="verify-label">File Size</span>
                        <span className="verify-value">{result.fileSize}</span>
                    </div>
                    <div className="verify-field">
                        <span className="verify-label">Uploader</span>
                        <span className="verify-value">{result.uploader}</span>
                    </div>
                    <div className="verify-field">
                        <span className="verify-label">Block Number</span>
                        <span className="verify-value">{result.blockNumber}</span>
                    </div>
                    <div className="verify-field">
                        <span className="verify-label">Timestamp</span>
                        <span className="verify-value">{result.timestamp}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
