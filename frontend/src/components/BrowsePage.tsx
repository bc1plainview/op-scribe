import React, { useState, useEffect, useCallback } from 'react';

/** File record displayed in the browser. */
interface DisplayFile {
    readonly cid: string;
    readonly fileName: string;
    readonly fileSize: string;
    readonly uploader: string;
    readonly blockNumber: string;
    readonly timestamp: string;
}

/**
 * Browse page -- displays all registered files.
 *
 * When the contract is deployed, this component will query getFileByIndex
 * in a loop from 0 to totalFiles-1 and display the results.
 *
 * @returns JSX element for the browse page.
 */
export function BrowsePage(): React.JSX.Element {
    const [files, setFiles] = useState<readonly DisplayFile[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [_totalFiles, setTotalFiles] = useState<bigint>(0n);

    const loadFiles = useCallback(async (): Promise<void> => {
        setLoading(true);

        // NOTE: Contract interaction requires deployment.
        // Once deployed, use:
        //
        // const provider = new JSONRpcProvider(OPNET_RPC_URL, networks.regtest);
        // const contract = getContract<IOPScribeContract>(...);
        // const totalResult = await contract.getTotalFiles();
        // const total = totalResult.decoded.count;
        // setTotalFiles(total);
        //
        // const fileList: DisplayFile[] = [];
        // for (let i = 0n; i < total; i++) {
        //     const result = await contract.getFileByIndex(i);
        //     fileList.push({
        //         cid: result.decoded.cid,
        //         fileName: result.decoded.fileName,
        //         fileSize: formatBytes(result.decoded.fileSize),
        //         uploader: `0x${result.decoded.uploader.toString(16).slice(0, 16)}...`,
        //         blockNumber: result.decoded.blockNumber.toString(),
        //         timestamp: new Date(Number(result.decoded.timestamp) * 1000).toISOString(),
        //     });
        // }
        // setFiles(fileList);

        // Placeholder: no contract deployed yet
        setTotalFiles(0n);
        setFiles([]);
        setLoading(false);
    }, []);

    useEffect((): void => {
        loadFiles().catch((): undefined => undefined);
    }, [loadFiles]);

    return (
        <div className="card">
            <div className="card-title">
                Registered Files
                <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ float: 'right', minWidth: 'auto', padding: '6px 12px', fontSize: '12px' }}
                    onClick={(): void => {
                        loadFiles().catch((): undefined => undefined);
                    }}
                >
                    Refresh
                </button>
            </div>

            {loading && (
                <div className="empty-state">
                    <span className="spinner" /> Loading files...
                </div>
            )}

            {!loading && files.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-title">No files registered yet</div>
                    <p>Upload a file to create the first on-chain proof.</p>
                    <p style={{ marginTop: '8px', fontSize: '13px' }}>
                        Contract deployment pending -- browse will populate after deployment.
                    </p>
                </div>
            )}

            {!loading && files.length > 0 && (
                <table className="file-table">
                    <thead>
                        <tr>
                            <th>CID</th>
                            <th>File Name</th>
                            <th>Size</th>
                            <th>Block</th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.map(
                            (file: DisplayFile): React.JSX.Element => (
                                <tr key={file.cid}>
                                    <td className="cid-cell" title={file.cid}>
                                        {file.cid}
                                    </td>
                                    <td>{file.fileName}</td>
                                    <td>{file.fileSize}</td>
                                    <td>{file.blockNumber}</td>
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}
