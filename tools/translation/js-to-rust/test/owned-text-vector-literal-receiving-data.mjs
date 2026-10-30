// Complete receiving fixture DATA only; no source/type/owner permission.
import {ownedTextVectorReceivingData} from './owned-text-vector-receiving-data.mjs';
import {ownedTextVectorLiteralRuntimeSources} from '../../owned-text-vector-literal-runtime-sources.mjs';
export function ownedTextVectorLiteralReceivingData(family,source,path='caller.mjs'){
 const data=ownedTextVectorReceivingData(family,source,path),files=new Map(data.files.map(row=>[row.path,row]));for(const row of ownedTextVectorLiteralRuntimeSources(data.runtimeRoot,data.declarationRoot)){const old=files.get(row.path);if(old&&old.source!==row.source)throw new TypeError('Complete String literal receiving source conflict');files.set(row.path,row);}return {...data,files:[...files.values()]};
}
