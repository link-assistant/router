export type ScalarLinearDomain='bool'|'u8'|'i8'|'u16'|'i16'|'u32'|'i32'|'u64'|'i64'|'u128'|'i128';
export declare function scalarLinearStage<I extends boolean|bigint,O extends boolean|bigint>(values:readonly I[],inputDomain:ScalarLinearDomain,operation:'map',domain:ScalarLinearDomain,callback:(value:I)=>O):readonly O[];
export declare function scalarLinearStage<I extends boolean|bigint>(values:readonly I[],inputDomain:ScalarLinearDomain,operation:'filter',domain:ScalarLinearDomain,callback:(value:I)=>boolean):readonly I[];
