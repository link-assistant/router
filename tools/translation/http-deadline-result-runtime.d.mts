import type {ControlResult} from './async-control-runtime.mjs';
import type {HttpStream,TransportResult,TransportOption} from './http-transport-runtime.mjs';
import type {JsonValue} from './json-macro-runtime.mjs';
export function router_http_deadline_flatten_open(value:ControlResult<TransportResult<HttpStream>>):TransportResult<HttpStream>;
export function router_http_deadline_flatten_read(value:ControlResult<TransportResult<TransportOption<string>>>):TransportResult<TransportOption<string>>;
export function router_http_deadline_flatten_send(value:ControlResult<TransportResult<JsonValue>>):TransportResult<JsonValue>;
