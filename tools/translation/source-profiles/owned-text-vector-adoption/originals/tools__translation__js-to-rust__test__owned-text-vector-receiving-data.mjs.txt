// Complete ordinary receiving fixture DATA only; never caller/type permission.
import {primitiveOwnedVectorReceivingData} from './primitive-owned-vector-receiving-data.mjs';
import {proposeOwnedTextVectorRootSource} from '../../owned-text-vector-root-source.mjs';
import {TEXT_NATIVE_SOURCE,TEXT_RUNTIME_SOURCE,TEXT_DECLARATIONS_SOURCE} from '../../text-native-source.mjs';
export function ownedTextVectorReceivingData(family,text,path='caller.mjs'){
 const data=primitiveOwnedVectorReceivingData(family,text,path),root=data.files.find(row=>row.path==='src/lib.rs'),proposal=proposeOwnedTextVectorRootSource(root.source,{runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot}),files=new Map(data.files.map(row=>[row.path,row]));
 for(const row of proposal.files){const next={path:row.path,source:row.after??row.source},before=files.get(row.path);if(before&&row.path!=='src/lib.rs'&&before.source!==next.source)throw new TypeError('Complete original owned text vector receiving sources conflict');files.set(row.path,next);}const actualRoot=files.get('src/lib.rs');if(!actualRoot.source.includes('pub mod translation_text_core;'))files.set('src/lib.rs',{...actualRoot,source:actualRoot.source+'\npub mod translation_text_core;\n'});
 for(const [path,source]of [['src/translation_text_core.rs',TEXT_NATIVE_SOURCE],[data.runtimeRoot+'/text-runtime.mjs',TEXT_RUNTIME_SOURCE],[data.declarationRoot+'/text-runtime.d.mts',TEXT_DECLARATIONS_SOURCE]]){const previous=files.get(path);if(previous&&previous.source!==source)throw new TypeError('Complete original text copy source conflict');files.set(path,{path,source});}return {...data,files:[...files.values()]};
}
