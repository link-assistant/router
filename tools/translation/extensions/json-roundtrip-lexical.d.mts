export declare const JSON_LEXICAL_MAX_MANTISSA_DIGITS:768;
export declare function lexicalConciseFloat64(mantissa:bigint,exponent:number):number;
export declare function lexicalTruncatedFloat64(integer:string,fraction:string,exponent:number):number;
export declare function lexicalModerateTrace(mantissa:bigint,exponent:number,truncated:boolean):Readonly<{mantissa:bigint;exponent:number;errors:number|null;accepted:boolean}>;
export declare function sourceLexicalMantissa(integer:string,fraction:string):Readonly<{coefficient:bigint;count:number;tailSynthesized:boolean;tailActuallyNonzero:boolean}>;
