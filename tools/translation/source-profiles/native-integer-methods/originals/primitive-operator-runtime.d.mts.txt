export declare function integerCast(value:bigint,inputBits:number,inputSigned:boolean,targetBits:number,targetSigned:boolean):bigint;
export declare function integerShift(value:bigint,count:bigint,bits:number,signed:boolean,countBits:number,countSigned:boolean,operation:string):bigint;
export declare function primitiveBitwise(left:boolean,right:boolean,operation:string,bits:null,signed:null):boolean;
export declare function primitiveBitwise(left:bigint,right:bigint,operation:string,bits:number,signed:boolean):bigint;

// Explicit native by-value ABI inputs are restricted to their Rust ranges.
export type RustU8=bigint;
export type RustI8=bigint;
export type RustU16=bigint;
export type RustI16=bigint;
export type RustU32=bigint;
export type RustI32=bigint;
export type RustU64=bigint;
export type RustI64=bigint;
export type RustU128=bigint;
export type RustI128=bigint;

export declare function primitiveNot(value:bigint,bits:number,signed:boolean):bigint;
