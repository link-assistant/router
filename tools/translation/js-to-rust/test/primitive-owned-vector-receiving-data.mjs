// Complete receiving fixture DATA only, not native caller/ownership authority.
import {primitiveSequenceReceivingData} from './primitive-sequence-receiving-data.mjs';
import {proposePrimitiveOwnedVectorRootSource} from '../../primitive-owned-vector-root-source.mjs';
export function primitiveOwnedVectorReceivingData(family,text,path='caller.mjs'){
 const data=primitiveSequenceReceivingData(family,text,path),root=data.files.find(row=>row.path==='src/lib.rs'),proposal=proposePrimitiveOwnedVectorRootSource(root.source,{runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot}),files=new Map(data.files.map(row=>[row.path,row]));for(const row of proposal.files){const value={path:row.path,source:row.after??row.source},prior=files.get(row.path);if(prior&&row.path!=='src/lib.rs'&&prior.source!==value.source)throw new TypeError('Conflicting complete owned vector receiving source');files.set(row.path,value);}return {...data,files:[...files.values()]};
}
