// Historical comparison DATA. Current proof APIs keep their private issuers.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readCompilerAliasHistory} from './fixtures/compiler-data-alias-history.mjs';
import {restoreReceivingSourceHistory} from './fixtures/current-receiving-source-history.mjs';
import {deriveProofScannerSourceEvolution} from '../proof-scanner-source-evolution.mjs';
import {invocationLocalFreezerSourcePairs} from '../prepare-invocation-local-freezer.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';

const path=fileURLToPath(new URL('../private-native-proof-json.mjs',import.meta.url));
const consumerPaths=['builtin-debug-ast-route.mjs','builtin-derive-bang-footprints.mjs'].map(name=>fileURLToPath(new URL('../'+name,import.meta.url)));
export function currentProofCostSourceHistory(source){
 const scanner=deriveProofScannerSourceEvolution(source);
 const pair=invocationLocalFreezerSourcePairs().find(row=>row.path===scanner.path);
 assert.ok(pair);assert.equal(scanner.original,pair.after,'complete freezer/scanner history join');
 const stages=completeStages(pair.original,pair.after,source);
 return {source:pair.original,actual:source,inverse:source,pair,scanner,stages,sourceAuthority:false,runtimeAuthority:false};
}
function completeStages(original,middle,current){
 const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]}),stages=[];
 let document=transportConcreteSyntaxSource(original,{language:'JavaScript'}).document;
 for(const [phase,before,after]of [['language',original,middle],['repository',middle,current]]){
  const beforeMeta=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(beforeMeta);
  assert.equal(fresh.source,before);
  const sequence={languageRules:[],repositoryRules:[]};
  sequence[phase==='language'?'languageRules':'repositoryRules']=[rule(before,after,'proof-cost-history:'+phase)];
  const run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),parsed=transportConcreteSyntaxMeta(afterMeta);
  assert.equal(parsed.source,after);
  const inverseSequence={languageRules:[],repositoryRules:[rule(after,before,'proof-cost-history:restore-complete-source')]};
  const inverse=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(parsed.document,inverseSequence).value));
  assert.equal(inverse.source,before);stages.push({phase,before,after,beforeMeta,afterMeta,sequence,inverseSequence,inverse:before,trace:run.trace});document=parsed.document;
 }
 return stages;
}
export function currentProofCostConsumerHistory(source){
 let selected=null;
 const historical=restoreReceivingSourceHistory(source,'proof-consumer',(_label,row)=>{assert.equal(selected,null);selected=row;});
 assert.ok(selected,'one complete registered current proof consumer required');
 assert.ok(consumerPaths.some(physical=>physical.endsWith('/'+selected.path)),'only the two original scoped consumers');
 assert.equal(selected.current,source);assert.equal(selected.historical,historical);assert.equal(selected.inverse,source);
 return {source:historical,actual:source,inverse:source,path:selected.path,stages:completeStages(historical,historical,source),sourceAuthority:false,runtimeAuthority:false};
}
function historicalRead(read,args){
 // Preserve native argument validation, byte reads, descriptors and errors.
 const source=read(...args);if(typeof source!=='string')return source;
 const input=args[0],physical=input instanceof URL?fileURLToPath(input):typeof input==='string'?resolve(input):null;
 if(physical===path)return currentProofCostSourceHistory(source).source;
 if(consumerPaths.includes(physical)){
  const history=currentProofCostConsumerHistory(source);assert.ok(physical.endsWith('/'+history.path));return history.source;
 }
 return source;
}
export function readProofCostScopeHistory(...args){return historicalRead(readCompilerAliasHistory,args);}
export function readProofRetainedCostHistory(...args){return historicalRead(readFileSync,args);}
