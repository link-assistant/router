// Complete ordinary receiving fixture DATA only; never caller/type permission.
import {primitiveOwnedVectorReceivingData} from './primitive-owned-vector-receiving-data.mjs';
import {proposeOwnedTextVectorRootSource} from '../../owned-text-vector-root-source.mjs';
export function ownedTextVectorReceivingData(family,text,path='caller.mjs'){
 const data=primitiveOwnedVectorReceivingData(family,text,path),root=data.files.find(row=>row.path==='src/lib.rs'),proposal=proposeOwnedTextVectorRootSource(root.source,{runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot}),files=new Map(data.files.map(row=>[row.path,row]));
 for(const row of proposal.files){const next={path:row.path,source:row.after??row.source},before=files.get(row.path);if(before&&row.path!=='src/lib.rs'&&before.source!==next.source)throw new TypeError('Complete original owned text vector receiving sources conflict');files.set(row.path,next);}return {...data,files:[...files.values()]};
}
