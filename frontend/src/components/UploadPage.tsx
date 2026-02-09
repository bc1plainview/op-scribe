import React, { useState, useCallback, useRef } from 'react';
import { uploadToIpfs, IpfsUploadResult } from '../services/ipfs';
import { MAX_FILE_SIZE_DISPLAY } from '../types/config';

/** Props for UploadPage. */
interface UploadPageProps {
    readonly walletAddress: string;
}

/** Upload processing stage. */
type UploadStage = 'idle' | 'uploading' | 'registering' | 'done' | 'error';

/**
 * Upload page -- handles file selection, IPFS upload, and on-chain registration.
 *
 * @param props - Component props with wallet address.
 * @returns JSX element for the upload page.
 */
export function UploadPage({ walletAddress }: UploadPageProps): React.JSX.Element {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState<boolean>(false);
    const [stage, setStage] = useState<UploadStage>('idle');
    const [uploadResult, setUploadResult] = useState<IpfsUploadResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((file: File): void => {
        setSelectedFile(file);
        setStage('idle');
        setUploadResult(null);
        setErrorMessage('');
    }, []);

    const handleInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>): void => {
            const files: FileList | null = event.target.files;
            if (files && files.length > 0) {
                const file: File | undefined = files[0];
                if (file) {
                    handleFileSelect(file);
                }
            }
        },
        [handleFileSelect],
    );

    const handleDragOver = useCallback((event: React.DragEvent): void => {
        event.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((): void => {
        setDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (event: React.DragEvent): void => {
            event.preventDefault();
            setDragOver(false);
            const files: FileList = event.dataTransfer.files;
            if (files.length > 0) {
                const file: File | undefined = files[0];
                if (file) {
                    handleFileSelect(file);
                }
            }
        },
        [handleFileSelect],
    );

    const handleZoneClick = useCallback((): void => {
        fileInputRef.current?.click();
    }, []);

    const formatFileSize = useCallback((bytes: number): string => {
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }, []);

    const handleUpload = useCallback(async (): Promise<void> => {
        if (!selectedFile) {
            return;
        }

        if (!walletAddress) {
            setErrorMessage('Please connect your wallet first.');
            setStage('error');
            return;
        }

        setStage('uploading');
        setErrorMessage('');

        try {
            // Step 1: Upload to IPFS via backend
            const result: IpfsUploadResult = await uploadToIpfs(selectedFile);
            setUploadResult(result);

            // Step 2: Register on-chain via OPWallet
            setStage('registering');

            // NOTE: Contract interaction requires deployment.
            // Once the contract is deployed and CONTRACT_ADDRESS is set,
            // uncomment and use the following pattern:
            //
            // const provider = new JSONRpcProvider(OPNET_RPC_URL, networks.regtest);
            // const contract = getContract<IOPScribeContract>(
            //     contractAddress, OP_SCRIBE_ABI, provider, networks.regtest, senderAddress
            // );
            // const simulation = await contract.registerFile(result.cid, result.fileName, BigInt(result.fileSize));
            // if ('error' in simulation) throw new Error(simulation.error);
            // await simulation.sendTransaction({ signer: null, mldsaSigner: null, refundTo: userAddress });

            // For now, mark as done after IPFS upload
            setStage('done');
        } catch (err: unknown) {
            const message: string = err instanceof Error ? err.message : 'Upload failed';
            setErrorMessage(message);
            setStage('error');
        }
    }, [selectedFile, walletAddress]);

    return (
        <div>
            <div className="card">
                <div className="card-title">Upload File</div>

                <div
                    className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleZoneClick}
                    role="button"
                    tabIndex={0}
                >
                    <span className="upload-zone-icon">[^]</span>
                    <div className="upload-zone-text">
                        Drop a file here or click to browse
                    </div>
                    <div className="upload-zone-hint">
                        Max {MAX_FILE_SIZE_DISPLAY} per file
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                />

                {selectedFile && (
                    <div className="file-info">
                        <div>
                            <div className="file-info-name">{selectedFile.name}</div>
                            <div className="file-info-size">
                                {formatFileSize(selectedFile.size)}
                                {selectedFile.type ? ` -- ${selectedFile.type}` : ''}
                            </div>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    className="btn btn-primary btn-full"
                    disabled={!selectedFile || stage === 'uploading' || stage === 'registering'}
                    onClick={(): void => {
                        handleUpload().catch((): undefined => undefined);
                    }}
                >
                    {stage === 'uploading' && (
                        <>
                            <span className="spinner" /> Uploading to IPFS...
                        </>
                    )}
                    {stage === 'registering' && (
                        <>
                            <span className="spinner" /> Registering on-chain...
                        </>
                    )}
                    {(stage === 'idle' || stage === 'done' || stage === 'error') &&
                        'Upload & Register'}
                </button>
            </div>

            {stage === 'done' && uploadResult && (
                <div className="status status-success">
                    File uploaded to IPFS successfully.
                    <br />
                    CID: <strong>{uploadResult.cid}</strong>
                    <br />
                    On-chain registration will be available after contract deployment.
                </div>
            )}

            {stage === 'error' && errorMessage && (
                <div className="status status-error">{errorMessage}</div>
            )}
        </div>
    );
}
