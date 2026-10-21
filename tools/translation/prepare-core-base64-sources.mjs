// Complete owned library source DATA only; never a type or executable permit.
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
export function prepareCoreBase64SourceData({sourceData,base64}={}){
 if(typeof sourceData!=='string'||typeof base64!=='string'||sourceData.length>2000000||base64.length>2000000)throw new TypeError('Bounded complete owned source DATA required');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')throw new TypeError('Installed TypeScript5.9.3 required');
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'owned-base64:complete-canonical-source-literals',apply:()=>{
   const file=ts.createSourceFile('router-core-source-data.mjs',sourceData,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)throw new TypeError('Complete original source-data grammar required');
   const declarations=file.statements.filter(ts.isVariableStatement).flatMap(row=>[...row.declarationList.declarations]);if(declarations.some(row=>ts.isIdentifier(row.name)&&/^ROUTER_CORE_BASE64_(SOURCE|SHA256)$/u.test(row.name.text)))throw new TypeError('Fresh base64 source-data extension required');
   const rust=transportConcreteSyntaxSource(base64,{language:'Rust'});if(transportConcreteSyntaxMeta(rust.meta).source!==base64)throw new TypeError('Complete library CST inverse differs');
   const sha256=createHash('sha256').update(base64).digest('hex'),append='\nexport const ROUTER_CORE_BASE64_SOURCE='+JSON.stringify(base64)+';\nexport const ROUTER_CORE_BASE64_SHA256='+JSON.stringify(sha256)+';\n';return {append,base64Meta:rust.meta,sha256};
  }}]},
  {phase:'repository',rules:[{id:'router-core:compose-base64-DATA-with-complete-source-inverse',apply:state=>{
   const before=transportConcreteSyntaxSource(sourceData,{language:'JavaScript'}),after=sourceData+state.append,run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'javascript:retain-every-existing-source-literal',edits:[]}],repositoryRules:[{id:'router-core:append-complete-base64-library-DATA',edits:[{span:[sourceData.length,sourceData.length],expected:'',replacement:state.append}]}]}),beforeMeta=serializeConcreteSyntaxMeta(before.document),afterMeta=serializeConcreteSyntaxMeta(run.value);if(transportConcreteSyntaxMeta(afterMeta).source!==after)throw new TypeError('Complete composed source differs');
   const inverse=applyConcreteSyntaxSubstitutions(run.value,{languageRules:[],repositoryRules:[{id:'router-core:restore-complete-original-source-DATA',edits:[{span:[0,after.length],expected:after,replacement:sourceData}]}]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==sourceData)throw new TypeError('Complete source inverse differs');
   return {before:sourceData,after,inverse:sourceData,...state,beforeMeta,afterMeta,authority:{source:false,type:false,executable:false}};
  }}]},
 ]);return pipeline.run(null);
}
