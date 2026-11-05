import type {Cancellation,ControlResult,Deferred} from './async-control-runtime.mjs';
import type {HttpClient,HttpStream,TransportResult,TransportOption} from './http-transport-runtime.mjs';
import type {JsonValue} from './json-macro-runtime.mjs';
export function router_http_deadline_open(argument0:bigint,argument1:HttpClient,argument2:JsonValue,argument3:Cancellation):Deferred<ControlResult<TransportResult<HttpStream>>>;
export function router_http_deadline_read(argument0:bigint,argument1:HttpStream,argument2:Cancellation):Deferred<ControlResult<TransportResult<TransportOption<string>>>>;
export function router_http_deadline_send(argument0:bigint,argument1:HttpClient,argument2:JsonValue,argument3:Cancellation):Deferred<ControlResult<TransportResult<JsonValue>>>;
