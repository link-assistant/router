declare const contextBrand: unique symbol;
declare const launcherWriterBrand: unique symbol;
declare const operationalWriterBrand: unique symbol;
export interface PersistentOutputContext {readonly kind:'owned-persistent-output-context';readonly [contextBrand]:true;}
export interface PersistentOutputOptions {
 readonly dataDirectory:string;
 readonly verbose:boolean;
 readonly quiet:boolean;
 readonly operation:string;
 readonly token:string|null;
 readonly secrets:readonly string[];
 readonly context:PersistentOutputContext|null;
 readonly version:string;
 readonly sourceCommit:string;
 /** Existing Python3 OS-lock dependency; null uses ROUTER_LOCK_PYTHON/defaults. */
 readonly python:string|null;
}
export interface PersistentLauncherWriter {readonly [launcherWriterBrand]:true;}
export interface PersistentOperationalWriter {readonly [operationalWriterBrand]:true;}
export type LauncherOutcome=Readonly<{kind:'ok';code:number}>|Readonly<{kind:'error';message:string}>;
export declare function createPersistentOperationContext(environment:readonly(readonly[string,string])[]):PersistentOutputContext;
export declare function snapshotPersistentOperationContext(context:PersistentOutputContext):Readonly<{stdout:string;stderr:string}>;
export declare function runPersistentOperational(options:PersistentOutputOptions,work:()=>number):number;
export declare function runPersistentLauncher(options:PersistentOutputOptions,work:()=>LauncherOutcome):number;
export declare function runPersistentLauncherOperational(options:PersistentOutputOptions,work:()=>number):number;
export declare function addPersistentLauncherSecret(secret:string):void;
export declare function checkPersistentLauncher():null;
export declare function recordPersistentLauncher(event:string,message:string):null;
export declare function createPersistentTraceWriter():PersistentLauncherWriter;
export declare function writePersistentTrace(writer:PersistentLauncherWriter,bytes:Uint8Array):bigint;
export declare function flushPersistentTrace(writer:PersistentLauncherWriter):null;
export declare function finishPersistentTrace(writer:PersistentLauncherWriter):null;
export declare function createPersistentOperationalWriter():PersistentOperationalWriter;
export declare function writePersistentOperational(writer:PersistentOperationalWriter,bytes:Uint8Array):bigint;
export declare function flushPersistentOperational(writer:PersistentOperationalWriter):null;
export declare function finishPersistentOperational(writer:PersistentOperationalWriter):null;
export declare function withPersistentTraceWriter<T>(work:(writer:PersistentLauncherWriter)=>T):T;
export declare function withPersistentOperationalWriter<T>(work:(writer:PersistentOperationalWriter)=>T):T;
