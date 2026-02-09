import { ABIDataTypes, BitcoinAbiTypes, BitcoinInterfaceAbi, CallResult, BaseContractProperties } from 'opnet';

/**
 * ABI for the OP_Scribe contract.
 */
export const OP_SCRIBE_ABI: BitcoinInterfaceAbi = [
    {
        name: 'registerFile',
        type: BitcoinAbiTypes.Function,
        constant: false,
        inputs: [
            { name: 'cid', type: ABIDataTypes.STRING },
            { name: 'fileName', type: ABIDataTypes.STRING },
            { name: 'fileSize', type: ABIDataTypes.UINT256 },
        ],
        outputs: [
            { name: 'success', type: ABIDataTypes.BOOL },
        ],
    },
    {
        name: 'getFile',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [
            { name: 'cid', type: ABIDataTypes.STRING },
        ],
        outputs: [
            { name: 'fileName', type: ABIDataTypes.STRING },
            { name: 'fileSize', type: ABIDataTypes.UINT256 },
            { name: 'uploader', type: ABIDataTypes.UINT256 },
            { name: 'blockNumber', type: ABIDataTypes.UINT256 },
            { name: 'timestamp', type: ABIDataTypes.UINT256 },
            { name: 'exists', type: ABIDataTypes.BOOL },
        ],
    },
    {
        name: 'checkFileExists',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [
            { name: 'cid', type: ABIDataTypes.STRING },
        ],
        outputs: [
            { name: 'exists', type: ABIDataTypes.BOOL },
        ],
    },
    {
        name: 'getTotalFiles',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [],
        outputs: [
            { name: 'count', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        name: 'getFileByIndex',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [
            { name: 'index', type: ABIDataTypes.UINT256 },
        ],
        outputs: [
            { name: 'cid', type: ABIDataTypes.STRING },
            { name: 'fileName', type: ABIDataTypes.STRING },
            { name: 'fileSize', type: ABIDataTypes.UINT256 },
            { name: 'uploader', type: ABIDataTypes.UINT256 },
            { name: 'blockNumber', type: ABIDataTypes.UINT256 },
            { name: 'timestamp', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        name: 'getIsPaused',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [],
        outputs: [
            { name: 'isPaused', type: ABIDataTypes.BOOL },
        ],
    },
    {
        name: 'FileRegistered',
        type: BitcoinAbiTypes.Event,
        values: [
            { name: 'fileSize', type: ABIDataTypes.UINT256 },
            { name: 'uploader', type: ABIDataTypes.ADDRESS },
        ],
    },
];

/** File record returned by getFile. */
export interface FileRecord {
    readonly fileName: string;
    readonly fileSize: bigint;
    readonly uploader: bigint;
    readonly blockNumber: bigint;
    readonly timestamp: bigint;
    readonly exists: boolean;
    readonly [key: string]: string | bigint | boolean;
}

/** File record returned by getFileByIndex. */
export interface IndexedFileRecord {
    readonly cid: string;
    readonly fileName: string;
    readonly fileSize: bigint;
    readonly uploader: bigint;
    readonly blockNumber: bigint;
    readonly timestamp: bigint;
    readonly [key: string]: string | bigint;
}

/** Typed return for getFile. */
export type GetFileResult = CallResult<FileRecord, []>;

/** Typed return for checkFileExists. */
export type CheckFileExistsResult = CallResult<{ exists: boolean }, []>;

/** Typed return for getTotalFiles. */
export type GetTotalFilesResult = CallResult<{ count: bigint }, []>;

/** Typed return for getFileByIndex. */
export type GetFileByIndexResult = CallResult<IndexedFileRecord, []>;

/** Typed return for registerFile. */
export type RegisterFileResult = CallResult<{ success: boolean }, []>;

/** Contract interface for type-safe interaction. */
export interface IOPScribeContract extends BaseContractProperties {
    registerFile(cid: string, fileName: string, fileSize: bigint): Promise<RegisterFileResult>;
    getFile(cid: string): Promise<GetFileResult>;
    checkFileExists(cid: string): Promise<CheckFileExistsResult>;
    getTotalFiles(): Promise<GetTotalFilesResult>;
    getFileByIndex(index: bigint): Promise<GetFileByIndexResult>;
    getIsPaused(): Promise<CallResult<{ isPaused: boolean }, []>>;
}
