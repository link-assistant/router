declare const cancellationBrand:unique symbol,senderBrand:unique symbol,receiverBrand:unique symbol;
export interface Cancellation {readonly [cancellationBrand]:true}
export interface Sender {readonly [senderBrand]:true}
export interface Receiver {readonly [receiverBrand]:true}
export type ControlError=Readonly<{$:'Cancelled'|'Timeout'|'Closed'|'Resource'|'InvalidInput'}>;
export type ControlResult<T>=Readonly<{$:'Ok';field0:T}>|Readonly<{$:'Err';field0:ControlError}>;
export type ControlOption<T>=Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
export interface Deferred<T> extends PromiseLike<T>{}
export const ASYNC_CONTROL_LIMITS:Readonly<{bytes:1048576;capacity:32;pending:32;delayMs:86400000n}>;
export function router_cancel_new(): Cancellation;
export function router_cancel_clone(argument0:Cancellation): Cancellation;
export function router_cancel_set(argument0:Cancellation): boolean;
export function router_cancel_is_set(argument0:Cancellation): boolean;
export function router_cancel_wait(argument0:Cancellation): Deferred<null>;
export function router_async_sleep(argument0:bigint,argument1:Cancellation): Deferred<ControlResult<null>>;
export function router_async_with_deadline<T>(argument0:bigint,argument1:Cancellation,argument2:(child:Cancellation)=>T|PromiseLike<T>): Deferred<ControlResult<T>>;
export function router_async_channel(argument0:bigint): ControlResult<readonly [Sender,Receiver]>;
export function router_async_sender_clone(argument0:Sender): Sender;
export function router_async_send(argument0:Sender,argument1:string,argument2:Cancellation): Deferred<ControlResult<null>>;
export function router_async_receive(argument0:Receiver,argument1:Cancellation): Deferred<ControlResult<ControlOption<string>>>;
export function router_async_close(argument0:Receiver): null;
export function router_async_dispose(argument0:Receiver): null;
export const ASYNC_CONTROL_SOURCE_AUTHORITY:Readonly<{sourceAuthority:false;semanticAuthority:false;runtimeParity:false}>;
export function withAsyncCancellation<T>(value:Cancellation,operation:(signal:AbortSignal)=>T|PromiseLike<T>):Deferred<T>;
