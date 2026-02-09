import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------
export type FileRegisteredEvent = {
    readonly fileSize: bigint;
    readonly uploader: Address;
};

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the registerFile function call.
 */
export type RegisterFile = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<FileRegisteredEvent>[]
>;

/**
 * @description Represents the result of the getFile function call.
 */
export type GetFile = CallResult<
    {
        fileName: string;
        fileSize: bigint;
        uploader: bigint;
        blockNumber: bigint;
        timestamp: bigint;
        exists: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the checkFileExists function call.
 */
export type CheckFileExists = CallResult<
    {
        exists: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getTotalFiles function call.
 */
export type GetTotalFiles = CallResult<
    {
        count: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getFileByIndex function call.
 */
export type GetFileByIndex = CallResult<
    {
        cid: string;
        fileName: string;
        fileSize: bigint;
        uploader: bigint;
        blockNumber: bigint;
        timestamp: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the pause function call.
 */
export type Pause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the unpause function call.
 */
export type Unpause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the getIsPaused function call.
 */
export type GetIsPaused = CallResult<
    {
        isPaused: boolean;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IOPScribe
// ------------------------------------------------------------------
export interface IOPScribe extends IOP_NETContract {
    registerFile(cid: string, fileName: string, fileSize: bigint): Promise<RegisterFile>;
    getFile(cid: string): Promise<GetFile>;
    checkFileExists(cid: string): Promise<CheckFileExists>;
    getTotalFiles(): Promise<GetTotalFiles>;
    getFileByIndex(index: bigint): Promise<GetFileByIndex>;
    pause(): Promise<Pause>;
    unpause(): Promise<Unpause>;
    getIsPaused(): Promise<GetIsPaused>;
}
