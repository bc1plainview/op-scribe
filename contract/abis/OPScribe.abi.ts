import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const OPScribeEvents = [
    {
        name: 'FileRegistered',
        values: [
            { name: 'fileSize', type: ABIDataTypes.UINT256 },
            { name: 'uploader', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
];

export const OPScribeAbi = [
    {
        name: 'registerFile',
        inputs: [
            { name: 'cid', type: ABIDataTypes.STRING },
            { name: 'fileName', type: ABIDataTypes.STRING },
            { name: 'fileSize', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getFile',
        inputs: [{ name: 'cid', type: ABIDataTypes.STRING }],
        outputs: [
            { name: 'fileName', type: ABIDataTypes.STRING },
            { name: 'fileSize', type: ABIDataTypes.UINT256 },
            { name: 'uploader', type: ABIDataTypes.UINT256 },
            { name: 'blockNumber', type: ABIDataTypes.UINT256 },
            { name: 'timestamp', type: ABIDataTypes.UINT256 },
            { name: 'exists', type: ABIDataTypes.BOOL },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'checkFileExists',
        inputs: [{ name: 'cid', type: ABIDataTypes.STRING }],
        outputs: [{ name: 'exists', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getTotalFiles',
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getFileByIndex',
        inputs: [{ name: 'index', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'cid', type: ABIDataTypes.STRING },
            { name: 'fileName', type: ABIDataTypes.STRING },
            { name: 'fileSize', type: ABIDataTypes.UINT256 },
            { name: 'uploader', type: ABIDataTypes.UINT256 },
            { name: 'blockNumber', type: ABIDataTypes.UINT256 },
            { name: 'timestamp', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'pause',
        inputs: [],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'unpause',
        inputs: [],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getIsPaused',
        inputs: [],
        outputs: [{ name: 'isPaused', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    ...OPScribeEvents,
    ...OP_NET_ABI,
];

export default OPScribeAbi;
