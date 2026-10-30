// Complete receiving DATA. The new private profiles independently reissue it.
import {ownedTextVectorLiteralReceivingData} from './owned-text-vector-literal-receiving-data.mjs';
import {ownedTextVectorJoinRuntimeSources} from '../../owned-text-vector-join-runtime-sources.mjs';
export function ownedTextVectorJoinReceivingData(family,source,path='caller.mjs'){
 const data=ownedTextVectorLiteralReceivingData(family,source,path),files=new Map(data.files.map(row=>[row.path,row]));for(const row of ownedTextVectorJoinRuntimeSources(data.runtimeRoot,data.declarationRoot)){const old=files.get(row.path);if(old&&old.source!==row.source)throw new TypeError('Whole original join receiving source conflict');files.set(row.path,row);}return {...data,files:[...files.values()]};
}
