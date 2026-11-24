// Fixed complete-source proposal DATA, never a compiler/source/owner permit.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline,exactSubstitutionRule} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const HOST='tools/translation/host-assets.mjs',OWNED='tools/translation/js-to-rust/owned-core-source.mjs';
const MARKER='\n// Explicit named-data declaration format; legacy assets above remain exact.\n';
const OLD_IMPORT="import {hostRuntimeAssets} from '../host-assets.mjs';";
const NEW_IMPORT="import {hostRuntimeAssetsNamedDataAliases as hostRuntimeAssets} from '../host-assets.mjs';";
const RULES=[{"before":"export function hostRuntimeAssets() {","after":"export function hostRuntimeAssetsNamedDataAliases() {"},{"before":"  const types=program.declarations,aliases=typeScriptAliases(types);","after":"  const types=program.declarations,aliases=typeScriptAliases(types);\n  const namedAliases=new Set([...types].filter(([,entry])=>entry.k==='data').map(([name])=>name));"},{"before":"typeScriptType(checker.hostType(type,[],{start:0,end:0}),types)","after":"typeScriptType(checker.hostType(type,[],{start:0,end:0}),types,{aliases:namedAliases})"},{"before":"typeScriptType(checker.hostType(contract.ret,[],{start:0,end:0}),types)","after":"typeScriptType(checker.hostType(contract.ret,[],{start:0,end:0}),types,{aliases:namedAliases})"},{"before":"typeScriptType(checker.hostType({kind:'named',path:['std','num','ParseIntError']},[],{start:0,end:0}),types)","after":"typeScriptType(checker.hostType({kind:'named',path:['std','num','ParseIntError']},[],{start:0,end:0}),types,{aliases:namedAliases})"}];
const fail=message=>{throw new TypeError('Named host declaration source proposal: '+message);};
const hash=source=>createHash('sha256').update(source).digest('hex');
export const NAMED_HOST_DECLARATION_SOURCE_PATHS=Object.freeze([HOST,OWNED]);
function exact(source,before,after,id){
 return exactSubstitutionRule(id,before,after.split('$').join('$$'),'unique source equation missing: '+id).apply(source);
}
function ownSources(input){
 if(!input||typeof input!=='object'||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('two complete own source strings required');
 const prototype=Object.getPrototypeOf(input),keys=Reflect.ownKeys(input);
 if(keys.length!==2||keys.some(key=>typeof key!=='string'||!NAMED_HOST_DECLARATION_SOURCE_PATHS.includes(key)))fail('exact two source paths required');
 const descriptors=Object.getOwnPropertyDescriptors(input),value=Object.create(null);let total=0;
 for(const path of NAMED_HOST_DECLARATION_SOURCE_PATHS){const field=descriptors[path];if(!field||!Object.hasOwn(field,'value')||!field.enumerable||typeof field.value!=='string'||field.value.length>262144)fail('bounded own source data required');total+=field.value.length;value[path]=field.value;}
 if(total>524288)fail('whole source budget');
 return {value,verify(){if(Object.getPrototypeOf(input)!==prototype)fail('source prototype changed');const now=Reflect.ownKeys(input);if(now.length!==keys.length||now.some((key,index)=>key!==keys[index]))fail('source key order changed');for(const key of keys){const a=descriptors[key],b=Object.getOwnPropertyDescriptor(input,key);if(!b||!Object.hasOwn(b,'value')||a.value!==b.value||a.enumerable!==b.enumerable||a.configurable!==b.configurable||a.writable!==b.writable)fail('source fields changed');}}};
}
function deriveHost(source){
 if(source.includes(MARKER))fail('named declaration sibling already present');
 const concrete=transportConcreteSyntaxSource(source,{language:'JavaScript'});
 if(concrete.source!==source)fail('complete source CST differs');
 const ts=ownershipCompiler(),file=ts.createSourceFile(HOST,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('original asset module syntax');
 const selected=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='hostRuntimeAssets');
 if(selected.length!==1)fail('one actual legacy function required');
 const node=selected[0],span=[node.getStart(file),node.end],kernel=source.slice(...span);
 if(!kernel.startsWith(RULES[0].before)||source.slice(span[1]).trim()!=='')fail('complete terminal legacy function required');
 let derived=kernel;
 for(const [index,rule]of RULES.entries())derived=exact(derived,rule.before,rule.after,'sibling-'+index);
 let inverse=derived;for(const [index,rule]of [...RULES].reverse().entries())inverse=exact(inverse,rule.after,rule.before,'sibling-inverse-'+index);
 if(inverse!==kernel)fail('complete sibling body inverse');
 return {source:source+MARKER+derived+'\n',span,kernel,derived,rules:RULES};
}
function stage(source,after,phase,id){
 const first=transportConcreteSyntaxSource(source,{language:'JavaScript'}),beforeMeta=serializeConcreteSyntaxMeta(first.document),before=transportConcreteSyntaxMeta(beforeMeta);
 if(before.source!==source)fail('complete input CST inverse');
 const edits=source===after?[]:[{span:[0,source.length],expected:source,replacement:after}],sequence={languageRules:phase==='language'?[{id,edits}]:[],repositoryRules:phase==='repository'?[{id,edits}]:[]};
 const applied=applyConcreteSyntaxSubstitutions(before.document,sequence),afterMeta=serializeConcreteSyntaxMeta(applied.value),restored=transportConcreteSyntaxMeta(afterMeta);
 if(restored.source!==after)fail('complete output CST inverse');
 const inverseEdits=source===after?[]:[{span:[0,after.length],expected:after,replacement:source}],inverse=applyConcreteSyntaxSubstitutions(restored.document,{languageRules:phase==='language'?[{id:id+'-inverse',edits:inverseEdits}]:[],repositoryRules:phase==='repository'?[{id:id+'-inverse',edits:inverseEdits}]:[]});
 if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)fail('whole CST source inverse');
 return {phase,id,before:{source,sha256:hash(source),meta:beforeMeta},after:{source:after,sha256:hash(after),meta:afterMeta},edits,trace:applied.trace,mapping:source===after?[{kind:'unchanged',before:[0,source.length],after:[0,after.length]}]:[{kind:'substitution',before:[0,source.length],after:[0,after.length],expected:source,replacement:after}],completeInverse:true};
}
export function proposeNamedHostDeclarationSources(input){
 const captured=ownSources(input),rows=[];
 for(const path of NAMED_HOST_DECLARATION_SOURCE_PATHS){
  const languageId='typescript-layout:explicit-all-data-aliases',repositoryId='router-owned-core:select-named-unused-declarations';
  const pipeline=createRulePipeline([
   {phase:'language',rules:[{id:languageId,apply:source=>stage(source,path===HOST?deriveHost(source).source:source,'language',languageId)}]},
   {phase:'repository',rules:[{id:repositoryId,apply:first=>({first,second:stage(first.after.source,path===OWNED?exact(first.after.source,OLD_IMPORT,NEW_IMPORT,'owned-runtime-import'):first.after.source,'repository',repositoryId)})}]},
  ]);
  const run=pipeline.run(captured.value[path]),{first,second}=run.value;
  rows.push({file:path,before:first.before,intermediate:first.after,after:second.after,stages:[first,second],trace:run.trace,completeInverse:true});
 }
 captured.verify();
 return {schema:'named-host-declaration-source-proposal-v1',rows,selectedSyntaxSites:{siblingLiteralEquations:5,signatureExpressions:3,ownedRuntimeImports:1},authority:{source:false,owner:false,type:false,executable:false},semanticChecksPassed:false,installApproved:false,obligations:[
  'Fresh complete physical/NativeGit source and genuine current CST/compiler joins remain mandatory.',
  'Legacy hostRuntimeAssets and public typeScriptType stay exact; the opt-in declaration format has an explicit different internal observation schedule.',
  'Independently compile complete old/new declarations with positive and negative strict consumers.',
  'Every selected ownedCoreRuntimeSources path/source/license must remain byte-exact after genuine complete native CST traversal.',
  'Every currentness, full Hash/source comparison, paired-source and independent native semantic fence remains required.',
  'No performance, owner, Rust-runtime or arbitrary callback-stack equivalence is issued by these source equations.',
 ]};
}
export function restoreNamedHostDeclarationSources(input){
 const captured=ownSources(input),source=captured.value[HOST],at=source.indexOf(MARKER);
 if(at<0||source.indexOf(MARKER,at+1)!==-1)fail('one complete appended named sibling required');
 const original=source.slice(0,at);if(deriveHost(original).source!==source)fail('complete named sibling differs');
 const restored=Object.create(null);restored[HOST]=original;restored[OWNED]=exact(captured.value[OWNED],NEW_IMPORT,OLD_IMPORT,'restore-owned-runtime-import');captured.verify();return restored;
}
