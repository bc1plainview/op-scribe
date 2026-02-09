import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';
import { OPScribe } from './OPScribe';

// DO NOT TOUCH THIS.
Blockchain.contract = (): OPScribe => {
    // ONLY CHANGE THE CONTRACT CLASS NAME.
    // DO NOT ADD CUSTOM LOGIC HERE.
    return new OPScribe();
};

// VERY IMPORTANT
export * from '@btc-vision/btc-runtime/runtime/exports';

// VERY IMPORTANT
export function abort(message: string, fileName: string, line: u32, column: u32): void {
    revertOnError(message, fileName, line, column);
}
