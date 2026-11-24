// Receiving fixture DATA only. Whole original private reissue is mandatory.
import {primitiveOwnedVectorReceivingData} from './primitive-owned-vector-receiving-data.mjs';
import {primitiveVectorLiteralRuntimeSources} from '../../primitive-vector-literal-runtime-sources.mjs';
export function primitiveVectorLiteralReceivingData(family,text,path='caller.mjs'){const data=primitiveOwnedVectorReceivingData(family,text,path),files=new Map(data.files.map(row=>[row.path,row]));for(const row of primitiveVectorLiteralRuntimeSources(data.runtimeRoot,data.declarationRoot)){const prior=files.get(row.path);if(prior&&prior.source!==row.source)throw new TypeError('Conflicting complete literal receiving source');files.set(row.path,row);}return {...data,files:[...files.values()]};}
