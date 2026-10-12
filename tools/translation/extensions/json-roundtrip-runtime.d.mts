// Candidate value ABI only; source/feature/allocator/full runtime admission is open.
type JsonNumber=Readonly<{$:'PosInt'|'NegInt';field0:bigint}>|Readonly<{$:'Float';field0:number}>;
type JsonValue=Readonly<{$:'Null'}>|Readonly<{$:'Bool';field0:boolean}>|Readonly<{$:'String';field0:string}>|Readonly<{$:'Number';field0:JsonNumber}>|Readonly<{$:'Array';field0:readonly JsonValue[]}>|Readonly<{$:'Object';field0:Readonly<{$:'Map';entries:readonly Readonly<{$:'MapEntry';key:string;value:JsonValue}>[]}>}>;
type JsonError=Readonly<{$:'JsonError';category:Readonly<{$:'Io'|'Syntax'|'Data'|'Eof'}>;line:bigint;column:bigint;message:string}>;
type JsonResult=Readonly<{$:'Ok';field0:JsonValue}>|Readonly<{$:'Err';field0:JsonError}>;
export declare const JSON_ROUNDTRIP_MAX_BYTES:1048576;
export declare function serde_json_roundtrip_from_str(value:string):JsonResult;
export declare function serde_json_roundtrip_from_slice(value:readonly bigint[]):JsonResult;

export type JsonRoundtripResult=JsonResult;
