import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    NetEvent,
    OP_NET,
    Revert,
    SafeMath,
    StoredBoolean,
    StoredU256,
    StoredMapU256,
    EMPTY_POINTER,
    U256_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';

// ABIDataTypes is provided as an ambient declaration by the opnet-transform plugin.

/**
 * Event emitted when a new file record is registered on-chain.
 */
@final
export class FileRegisteredEvent extends NetEvent {
    constructor(
        fileSize: u256,
        uploader: Address,
    ) {
        const data: BytesWriter = new BytesWriter(U256_BYTE_LENGTH + 32);
        data.writeU256(fileSize);
        data.writeAddress(uploader);
        super('FileRegistered', data);
    }
}

/**
 * OP_Scribe -- On-chain proof of file existence contract.
 *
 * Stores file records keyed by a deterministic hash of the IPFS CID.
 * Each record contains: fileName, fileSize, uploader address, block number, timestamp.
 *
 * The contract does NOT hold BTC. Users sign the registerFile transaction
 * via OPWallet and pay their own fees.
 *
 * Storage layout (pointers are auto-allocated via Blockchain.nextPointer):
 *  0: paused (bool)
 *  1: totalFiles (u256)
 *  2: fileSizes (cidHash -> u256)
 *  3: fileUploaders (cidHash -> u256-encoded address)
 *  4: fileBlocks (cidHash -> u256 block number)
 *  5: fileTimestamps (cidHash -> u256 timestamp)
 *  6: fileExists (cidHash -> u256 0 or 1)
 *  7: fileNameChunks (cidHash * 256 + slot -> u256 chunk)
 *  8: cidChunks (index * 256 + slot -> u256 chunk)
 */
@final
export class OPScribe extends OP_NET {
    /** Storage pointers -- allocated sequentially at class level. */
    private readonly pausedPointer: u16 = Blockchain.nextPointer;
    private readonly totalFilesPointer: u16 = Blockchain.nextPointer;
    private readonly fileSizesPointer: u16 = Blockchain.nextPointer;
    private readonly fileUploadersPointer: u16 = Blockchain.nextPointer;
    private readonly fileBlocksPointer: u16 = Blockchain.nextPointer;
    private readonly fileTimestampsPointer: u16 = Blockchain.nextPointer;
    private readonly fileExistsPointer: u16 = Blockchain.nextPointer;
    private readonly fileNameChunksPointer: u16 = Blockchain.nextPointer;
    private readonly cidChunksPointer: u16 = Blockchain.nextPointer;

    /** Storage instances -- initialized inline (AssemblyScript requirement). */
    private readonly paused: StoredBoolean = new StoredBoolean(this.pausedPointer, false);
    private readonly totalFiles: StoredU256 = new StoredU256(
        this.totalFilesPointer,
        EMPTY_POINTER,
    );
    private readonly fileSizes: StoredMapU256 = new StoredMapU256(this.fileSizesPointer);
    private readonly fileUploaders: StoredMapU256 = new StoredMapU256(
        this.fileUploadersPointer,
    );
    private readonly fileBlocks: StoredMapU256 = new StoredMapU256(this.fileBlocksPointer);
    private readonly fileTimestamps: StoredMapU256 = new StoredMapU256(
        this.fileTimestampsPointer,
    );
    private readonly fileExists: StoredMapU256 = new StoredMapU256(this.fileExistsPointer);
    private readonly fileNameChunks: StoredMapU256 = new StoredMapU256(
        this.fileNameChunksPointer,
    );
    private readonly cidChunks: StoredMapU256 = new StoredMapU256(this.cidChunksPointer);

    public constructor() {
        super();
    }

    /**
     * One-time initialization on first deployment.
     */
    public override onDeployment(_calldata: Calldata): void {
        this.totalFiles.value = u256.Zero;
    }

    /**
     * Ensures the contract is not paused.
     *
     * @throws {Revert} If the contract is paused.
     */
    private ensureNotPaused(): void {
        if (this.paused.value) {
            throw new Revert('Contract paused');
        }
    }

    /**
     * Converts a CID string to a deterministic u256 storage key.
     * Uses a simple hash mixing to produce a collision-resistant key.
     *
     * @param cid - The IPFS Content Identifier string.
     * @returns A deterministic u256 key derived from the CID.
     */
    private cidToKey(cid: string): u256 {
        // Encode the CID string to UTF8 bytes
        const cidBuffer: ArrayBuffer = String.UTF8.encode(cid);
        const cidBytes: Uint8Array = Uint8Array.wrap(cidBuffer);
        const len: i32 = cidBytes.length;

        // Simple deterministic mixing: two 64-bit accumulators
        let hi: u64 = 0xcbf29ce484222325; // FNV offset basis
        let lo: u64 = 0x100000001b3; // FNV prime
        for (let i: i32 = 0; i < len; i++) {
            const b: u64 = <u64>unchecked(cidBytes[i]);
            hi = (hi ^ b) * 0x100000001b3;
            lo = (lo ^ (b + <u64>i)) * 0xcbf29ce484222325;
        }

        // Build u256 from the two u64 values
        return new u256(lo, hi, ~hi, ~lo);
    }

    /**
     * Stores a UTF8 string into chunked u256 slots in a StoredMapU256.
     * Slot 0 (baseKey) holds the byte length, subsequent slots hold 32-byte chunks.
     *
     * @param map - The storage map to write into.
     * @param baseKey - The base key for slot 0 (length).
     * @param value - The string to store.
     */
    private storeString(map: StoredMapU256, baseKey: u256, value: string): void {
        const buf: ArrayBuffer = String.UTF8.encode(value);
        const bytes: Uint8Array = Uint8Array.wrap(buf);
        const totalLen: u32 = <u32>bytes.length;

        // Store length in base slot
        map.set(baseKey, u256.fromU32(totalLen));

        // Store 32-byte chunks in subsequent slots
        const chunks: i32 = <i32>((totalLen + 31) / 32);
        for (let i: i32 = 0; i < chunks; i++) {
            const chunkArr: u8[] = new Array<u8>(32);
            // Zero-fill is default for new Array
            const start: i32 = i * 32;
            const end: i32 = start + 32 > <i32>totalLen ? <i32>totalLen : start + 32;
            for (let j: i32 = start; j < end; j++) {
                unchecked((chunkArr[j - start] = bytes[j]));
            }
            const slotKey: u256 = SafeMath.add(baseKey, u256.fromU32(<u32>(i + 1)));
            map.set(slotKey, u256.fromBytesBE(chunkArr));
        }
    }

    /**
     * Reads a UTF8 string from chunked u256 slots in a StoredMapU256.
     *
     * @param map - The storage map to read from.
     * @param baseKey - The base key for slot 0 (length).
     * @returns The decoded string.
     */
    private readString(map: StoredMapU256, baseKey: u256): string {
        const lengthVal: u256 = map.get(baseKey);
        if (u256.eq(lengthVal, u256.Zero)) {
            return '';
        }

        const totalLen: i32 = <i32>lengthVal.toU32();
        const buf: Uint8Array = new Uint8Array(totalLen);
        const chunks: i32 = (totalLen + 31) / 32;

        for (let i: i32 = 0; i < chunks; i++) {
            const slotKey: u256 = SafeMath.add(baseKey, u256.fromU32(<u32>(i + 1)));
            const slotVal: u256 = map.get(slotKey);
            const slotBytes: Uint8Array = slotVal.toUint8Array(true); // big-endian
            const start: i32 = i * 32;
            const end: i32 = start + 32 > totalLen ? totalLen : start + 32;
            for (let j: i32 = start; j < end; j++) {
                unchecked((buf[j] = slotBytes[j - start]));
            }
        }

        return String.UTF8.decodeUnsafe(changetype<usize>(buf.buffer), totalLen);
    }

    /**
     * Registers a new file record on-chain.
     *
     * @param calldata - Contains: cid (string), fileName (string), fileSize (uint256).
     * @emits FileRegistered
     * @throws {Revert} If contract is paused, inputs invalid, or file already registered.
     */
    @method(
        { name: 'cid', type: ABIDataTypes.STRING },
        { name: 'fileName', type: ABIDataTypes.STRING },
        { name: 'fileSize', type: ABIDataTypes.UINT256 },
    )
    @emit('FileRegistered')
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public registerFile(calldata: Calldata): BytesWriter {
        this.ensureNotPaused();

        const cid: string = calldata.readStringWithLength();
        const fileName: string = calldata.readStringWithLength();
        const fileSize: u256 = calldata.readU256();

        // Validate inputs
        if (cid.length === 0) {
            throw new Revert('CID cannot be empty');
        }
        if (fileName.length === 0) {
            throw new Revert('File name cannot be empty');
        }
        if (u256.eq(fileSize, u256.Zero)) {
            throw new Revert('File size cannot be zero');
        }

        // Derive storage key from CID
        const cidKey: u256 = this.cidToKey(cid);

        // Check if already registered
        const existsVal: u256 = this.fileExists.get(cidKey);
        if (u256.eq(existsVal, u256.One)) {
            throw new Revert('File already registered');
        }

        // Store file metadata
        this.fileSizes.set(cidKey, fileSize);

        // Store uploader address as u256 (Address is a 32-byte u8 array)
        const sender: Address = Blockchain.tx.sender;
        const senderBytes: u8[] = new Array<u8>(32);
        for (let i: i32 = 0; i < 32; i++) {
            unchecked((senderBytes[i] = sender[i]));
        }
        this.fileUploaders.set(cidKey, u256.fromBytesBE(senderBytes));

        // Store block number and timestamp
        this.fileBlocks.set(cidKey, u256.fromU64(Blockchain.block.number));
        this.fileTimestamps.set(cidKey, u256.fromU64(Blockchain.block.medianTimestamp));

        // Mark as existing
        this.fileExists.set(cidKey, u256.One);

        // Store file name in chunked storage
        this.storeString(this.fileNameChunks, cidKey, fileName);

        // Store CID string by index for enumeration
        const currentIndex: u256 = this.totalFiles.value;
        // Use index * 256 to space out chunk slots and avoid collisions
        const cidBaseKey: u256 = SafeMath.mul(currentIndex, u256.fromU32(256));
        this.storeString(this.cidChunks, cidBaseKey, cid);

        // Increment total file count
        this.totalFiles.value = SafeMath.add(currentIndex, u256.One);

        // Emit event
        this.emitEvent(new FileRegisteredEvent(fileSize, sender));

        const response: BytesWriter = new BytesWriter(1);
        response.writeBoolean(true);
        return response;
    }

    /**
     * Retrieves a file record by its IPFS CID.
     *
     * @param calldata - Contains: cid (string).
     * @returns fileName, fileSize, uploader, blockNumber, timestamp, exists.
     */
    @method({ name: 'cid', type: ABIDataTypes.STRING })
    @returns(
        { name: 'fileName', type: ABIDataTypes.STRING },
        { name: 'fileSize', type: ABIDataTypes.UINT256 },
        { name: 'uploader', type: ABIDataTypes.UINT256 },
        { name: 'blockNumber', type: ABIDataTypes.UINT256 },
        { name: 'timestamp', type: ABIDataTypes.UINT256 },
        { name: 'exists', type: ABIDataTypes.BOOL },
    )
    public getFile(calldata: Calldata): BytesWriter {
        const cid: string = calldata.readStringWithLength();
        const cidKey: u256 = this.cidToKey(cid);

        const existsVal: u256 = this.fileExists.get(cidKey);
        const exists: boolean = u256.eq(existsVal, u256.One);

        if (!exists) {
            const response: BytesWriter = new BytesWriter(
                4 + U256_BYTE_LENGTH * 4 + 1,
            );
            response.writeStringWithLength('');
            response.writeU256(u256.Zero);
            response.writeU256(u256.Zero);
            response.writeU256(u256.Zero);
            response.writeU256(u256.Zero);
            response.writeBoolean(false);
            return response;
        }

        const fileName: string = this.readString(this.fileNameChunks, cidKey);
        const fileSize: u256 = this.fileSizes.get(cidKey);
        const uploader: u256 = this.fileUploaders.get(cidKey);
        const blockNumber: u256 = this.fileBlocks.get(cidKey);
        const timestamp: u256 = this.fileTimestamps.get(cidKey);

        const response: BytesWriter = new BytesWriter(
            4 + fileName.length + U256_BYTE_LENGTH * 4 + 1,
        );
        response.writeStringWithLength(fileName);
        response.writeU256(fileSize);
        response.writeU256(uploader);
        response.writeU256(blockNumber);
        response.writeU256(timestamp);
        response.writeBoolean(true);
        return response;
    }

    /**
     * Checks whether a file CID has been registered.
     *
     * @param calldata - Contains: cid (string).
     * @returns exists (bool).
     */
    @method({ name: 'cid', type: ABIDataTypes.STRING })
    @returns({ name: 'exists', type: ABIDataTypes.BOOL })
    public checkFileExists(calldata: Calldata): BytesWriter {
        const cid: string = calldata.readStringWithLength();
        const cidKey: u256 = this.cidToKey(cid);
        const existsVal: u256 = this.fileExists.get(cidKey);

        const response: BytesWriter = new BytesWriter(1);
        response.writeBoolean(u256.eq(existsVal, u256.One));
        return response;
    }

    /**
     * Returns the total number of registered files.
     *
     * @returns count (uint256).
     */
    @method()
    @returns({ name: 'count', type: ABIDataTypes.UINT256 })
    public getTotalFiles(_calldata: Calldata): BytesWriter {
        const response: BytesWriter = new BytesWriter(U256_BYTE_LENGTH);
        response.writeU256(this.totalFiles.value);
        return response;
    }

    /**
     * Returns file CID and full metadata by sequential index.
     *
     * @param calldata - Contains: index (uint256).
     * @returns cid, fileName, fileSize, uploader, blockNumber, timestamp.
     * @throws {Revert} If index is out of bounds.
     */
    @method({ name: 'index', type: ABIDataTypes.UINT256 })
    @returns(
        { name: 'cid', type: ABIDataTypes.STRING },
        { name: 'fileName', type: ABIDataTypes.STRING },
        { name: 'fileSize', type: ABIDataTypes.UINT256 },
        { name: 'uploader', type: ABIDataTypes.UINT256 },
        { name: 'blockNumber', type: ABIDataTypes.UINT256 },
        { name: 'timestamp', type: ABIDataTypes.UINT256 },
    )
    public getFileByIndex(calldata: Calldata): BytesWriter {
        const index: u256 = calldata.readU256();

        if (index >= this.totalFiles.value) {
            throw new Revert('Index out of bounds');
        }

        const cidBaseKey: u256 = SafeMath.mul(index, u256.fromU32(256));
        const cid: string = this.readString(this.cidChunks, cidBaseKey);
        const cidKey: u256 = this.cidToKey(cid);

        const fileName: string = this.readString(this.fileNameChunks, cidKey);
        const fileSize: u256 = this.fileSizes.get(cidKey);
        const uploader: u256 = this.fileUploaders.get(cidKey);
        const blockNumber: u256 = this.fileBlocks.get(cidKey);
        const timestamp: u256 = this.fileTimestamps.get(cidKey);

        const response: BytesWriter = new BytesWriter(
            4 + cid.length + 4 + fileName.length + U256_BYTE_LENGTH * 4,
        );
        response.writeStringWithLength(cid);
        response.writeStringWithLength(fileName);
        response.writeU256(fileSize);
        response.writeU256(uploader);
        response.writeU256(blockNumber);
        response.writeU256(timestamp);
        return response;
    }

    /**
     * Pauses the contract. Only the deployer can call this.
     *
     * @throws {Revert} If the caller is not the deployer.
     */
    @method()
    public pause(_calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);
        this.paused.value = true;
        return new BytesWriter(0);
    }

    /**
     * Unpauses the contract. Only the deployer can call this.
     *
     * @throws {Revert} If the caller is not the deployer.
     */
    @method()
    public unpause(_calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);
        this.paused.value = false;
        return new BytesWriter(0);
    }

    /**
     * Returns whether the contract is currently paused.
     *
     * @returns isPaused (bool).
     */
    @method()
    @returns({ name: 'isPaused', type: ABIDataTypes.BOOL })
    public getIsPaused(_calldata: Calldata): BytesWriter {
        const response: BytesWriter = new BytesWriter(1);
        response.writeBoolean(<boolean>this.paused.value);
        return response;
    }
}
