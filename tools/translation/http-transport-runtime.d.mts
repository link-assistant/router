import type {Cancellation,Deferred} from './async-control-runtime.mjs';
import type {JsonValue} from './json-macro-runtime.mjs';
declare const clientBrand:unique symbol,streamBrand:unique symbol;
export interface HttpClient {readonly [clientBrand]:true}
export interface HttpStream {readonly [streamBrand]:true}
export type TransportResult<T>=Readonly<{$:'Ok';field0:T}>|Readonly<{$:'Err';field0:string}>;
export type TransportOption<T>=Readonly<{$:'Some';field0:T}>|Readonly<{$:'None'}>;
export const HTTP_TRANSPORT_LIMITS:Readonly<{clientsActive:32;chunkBytes:65536;pendingBytes:1048576;bufferedBodyBytes:786432;delayMs:86400000n}>;
export function router_http_transport_client_new(argument0:bigint,argument1:bigint,argument2:bigint,argument3:string): TransportResult<HttpClient>;
export function router_http_transport_client_clone(argument0:HttpClient): TransportResult<HttpClient>;
export function router_http_transport_client_dispose(argument0:HttpClient): null;
export function router_http_transport_open(argument0:HttpClient,argument1:JsonValue,argument2:Cancellation): Deferred<TransportResult<HttpStream>>;
export function router_http_transport_head(argument0:HttpStream): JsonValue;
export function router_http_transport_close(argument0:HttpStream): null;
export function router_http_transport_read(argument0:HttpStream,argument1:Cancellation): Deferred<TransportResult<TransportOption<string>>>;
export function router_http_transport_send(argument0:HttpClient,argument1:JsonValue,argument2:Cancellation): Deferred<TransportResult<JsonValue>>;
