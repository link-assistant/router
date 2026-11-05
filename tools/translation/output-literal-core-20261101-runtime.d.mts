import type {LiteralArguments} from './literal-arguments-core-20261101-runtime.mjs';
declare const backendBrand: unique symbol;
export interface OutputBackend { readonly kind: 'owned-literal-output-backend'; readonly [backendBrand]: true; }
export interface IoFailure { readonly kind: 'io-error'; readonly message: string; }
export interface OutputBridge {
 capture(text: string): boolean;
 fileDiagnostics(): boolean | null;
 diagnostic(text: string, quiet: boolean): null;
 contextWrite(stderr: boolean, text: string): boolean;
 processWrite(stderr: boolean, text: string): null | IoFailure;
}
export declare function createOutputBridgeBackend(input: OutputBridge): OutputBackend;
export declare function withOutputLiteralBackend<T>(backend: OutputBackend, operation: () => T): T;
export declare function output_literal_write(stderr: boolean, value: LiteralArguments): null;
export declare function output_literal_result(stderr: boolean, value: LiteralArguments): null;
export declare function output_literal_passthrough(stderr: boolean, value: LiteralArguments): null;
export interface MemoryOptions {captureActive: boolean;captureTerminal: boolean;operationActive: boolean;fileDiagnostics: boolean|null;transportError: boolean;}
export interface OutputEvent {readonly kind: string;readonly stderr: boolean;readonly text: string;readonly quiet: boolean|null;}
export interface OutputSnapshot {readonly stdout: string;readonly stderr: string;readonly events: readonly OutputEvent[];readonly bytes: number;}
export declare function createMemoryOutputBackend(options: MemoryOptions): Readonly<{backend: OutputBackend;snapshot(): OutputSnapshot}>;
