// Receiving source only. Keep local resources while relocating every module import.
import {relocateSourceModule} from './relocate-source-module.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {transportConcreteSyntaxSource,serializeConcreteSyntaxMeta,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const fail=message=>{throw TypeError('Complete receiving imports: '+message);};
function concrete(source){const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);if(transportConcreteSyntaxMeta(wire).source!==source)fail('whole source CST differs');return wire;}
// The original helper supplies a fresh complete native census. Its verdict is
// DATA only; select import spans and independently parse/reverse the new copy.
export function relocateModuleImports(source,origin,overrides=new Map()){
 const complete=relocateSourceModule(source,origin,overrides),ts=ownershipCompiler();let selected;
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:complete-native-import-census',apply:value=>{if(value!==source||complete.source!==source||complete.inverse!==source)fail('complete original source differs');selected=complete.selected.filter(row=>row.kind!=='original-module-url');return value;}}]},
  {phase:'repository',rules:[{id:'receiving:imports-with-local-resource-base',apply:value=>{
   let text=value;for(const row of [...selected].reverse()){if(text.slice(row.start,row.end)!==row.before)fail('original native import span differs');text=text.slice(0,row.start)+row.after+text.slice(row.end);}
   let delta=0;const mapping=selected.map(row=>{const start=row.start+delta;delta+=row.after.length-(row.end-row.start);return {...row,afterSpan:[start,start+row.after.length]};});
   const parsed=ts.createSourceFile(origin,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(parsed.parseDiagnostics.length)fail('complete receiving native grammar');
   let inverse=text;for(const row of [...mapping].reverse()){const [start,end]=row.afterSpan;if(inverse.slice(start,end)!==row.after)fail('independent inverse span differs');inverse=inverse.slice(0,start)+row.before+inverse.slice(end);}if(inverse!==source)fail('complete inverse differs');
   return {source,text,origin,selected,mapping,inverse,beforeMeta:concrete(source),afterMeta:concrete(text),localResourceBasePreserved:true,compilerAuthority:false,completeOriginalRelocation:complete};
  }}]},
 ]).run(source);return {...run.value,trace:run.trace};
}
