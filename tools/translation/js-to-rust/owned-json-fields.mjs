// The full fixed native source and actual root edge are mandatory on use.
import {JSON_FIELD_CONTRACTS,jsonFieldContract} from '../json-field-contracts.mjs';
import {JSON_FIELDS_NATIVE_SOURCE,JSON_FIELDS_RUNTIME_SOURCE,JSON_FIELDS_DECLARATIONS_SOURCE} from '../json-fields-native-source.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
export const ownedJsonFieldOperation=jsonFieldContract;
export function requireOwnedJsonFieldSources(files,{runtimeRoot,declarationRoot}={}){
 const root=files.get('src/lib.rs'),source=files.get('src/translation_json_fields_core.rs');if(typeof root!=='string'||source!==JSON_FIELDS_NATIVE_SOURCE)throw new TypeError('Complete actual owned JSON field native source required');
 const records=[];if(runtimeRoot!==undefined&&(files.get(runtimeRoot+'/json-fields-runtime.mjs')!==JSON_FIELDS_RUNTIME_SOURCE||files.get(declarationRoot+'/json-fields-runtime.d.mts')!==JSON_FIELDS_DECLARATIONS_SOURCE))throw new TypeError('Complete actual JSON field runtime/declaration source differs');
 for(const [path,text]of [['src/lib.rs',root],['src/translation_json_fields_core.rs',source]]){
  const concrete=transportConcreteSyntaxSource(text,{language:'Rust'}),capture=captureSourceModuleViews({source:concrete.source,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){
   const edges=items.filter(item=>item.term==='mod'&&item.name==='translation_json_fields_core');if(edges.length!==1||text.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_json_fields_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_json_fields_core')))throw new TypeError('One actual unambiguous JSON fields module edge required');
  }else{const functions=items.filter(item=>item.term==='fn');if(functions.length!==JSON_FIELD_CONTRACTS.length||functions.some(item=>!jsonFieldContract(item.name)))throw new TypeError('Complete JSON field native operation census differs');}
  records.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }
 return records;
}
export function emitOwnedJsonFieldCall(value,{rust,expr,imports,sequence}){
 const row=jsonFieldContract(value.name);if(!row||row.ret!==value.type||value.args.length!==row.args.length)throw new TypeError('Complete actual checked JSON field operation differs');imports.add(value.name);
 if(!rust)return '__ro_'+value.name+'('+value.args.map(argument=>expr(argument)).join(', ')+')';
 const names=value.args.map(()=> '__ro_field_'+sequence()),bindings=value.args.map((argument,index)=>'let '+names[index]+' = '+(index===0&&argument.type==='json'||index>0&&row.args[index]==='str'&&argument.type==='text-owned'?(argument.kind==='variable'?expr(argument,true):'&'+expr(argument)):expr(argument))+';');
 return '{ '+bindings.join(' ')+' '+row.rustPath+'('+names.join(', ')+') }';
}
export function evaluateOwnedJsonFieldCall(value,{state,scope,get}){const row=jsonFieldContract(value.name);if(!row||!state.modules.fields)throw new TypeError('Unissued JSON field runtime');return Reflect.apply(state.modules.fields[value.name],undefined,value.args.map(argument=>get(argument,scope)));}
