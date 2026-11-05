export declare function integerCast(value:bigint,inputBits:number,inputSigned:boolean,targetBits:number,targetSigned:boolean):bigint;
export declare function integerShift(value:bigint,count:bigint,bits:number,signed:boolean,countBits:number,countSigned:boolean,operation:string):bigint;
export declare function primitiveBitwise(left:boolean,right:boolean,operation:string,bits:null,signed:null):boolean;
export declare function primitiveBitwise(left:bigint,right:bigint,operation:string,bits:number,signed:boolean):bigint;
