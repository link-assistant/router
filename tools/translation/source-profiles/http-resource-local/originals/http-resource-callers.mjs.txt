// A separate source-bound reverse lane for standard filesystem effect wrappers.
// Existing portable/owned APIs retain their original admission domains.
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
import {types} from 'node:util';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {prepareReverseConcreteSource,parseReverseConcreteSource} from './concrete-source.mjs';
import {httpResourceCallerContract,httpResourceCallerRustType,checkHttpResourceCallerFlow,emitHttpResourceCallerFlow} from './http-resource-caller-flow.mjs';
import {captureHttpResourceCallerInputs,analyzeHttpResourceCallerSource} from './http-resource-caller-source.mjs';
import {hasHttpResourceBorrowedText} from './http-resource-borrowed-text.mjs';


import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';

const RUNTIME=new URL('../async-control-runtime.mjs',import.meta.url);
const SCHEMA='router-http-resource-callers-v1';
const reserved=new Set('as async await break const continue crate default do dyn else enum export extern false fn for function if impl import in let loop match mod move mut new null pub ref return self static struct super switch this throw trait true try type typeof undefined unsafe use var void where while with yield std tokio'.split(' '));
const fail=message=>{throw new TypeError('Reverse filesystem effects: '+message);};
function path(value){if(typeof value!=='string'||!value||value.startsWith('/')||value.includes('\\')||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('repository-relative ordinary source path required');return value;}
function own(value,key){if(!value||typeof value!=='object'||types.isProxy(value))fail('ordinary input record required');const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value'))fail('own data field required: '+key);return field.value;}
function name(value){if(typeof value!=='string'||!/^[_a-zA-Z][_a-zA-Z0-9]*$/u.test(value)||reserved.has(value)||value.startsWith('__ro_'))fail('portable unshadowed identifier required');return value;}
function options(input){return captureHttpResourceCallerInputs(input);}
function contract(id){const row=httpResourceCallerContract(id);if(!row)fail('unregistered control operation');return row;}
function rustResult(row){return httpResourceCallerRustType(row.ret);}
function flow(...args){return checkHttpResourceCallerFlow(...args);}
function emitFlow(value){return emitHttpResourceCallerFlow(value);}
function analyze(stage,input){return analyzeHttpResourceCallerSource(stage,input);}
function edit(source,edits){let value=source,last=source.length+1;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>=last)fail('overlapping native type selections');value=value.slice(0,row.span[0])+row.replacement+value.slice(row.span[1]);last=row.span[0];}return value;}
function emit(rows){
 return rows.map(row=>{
  const borrowedText=hasHttpResourceBorrowedText(row.returns),generics=borrowedText?"<'a>":'',roots=new Set(row.flow.returnRoots),parameters=row.parameters.map(parameter=>name(parameter.name)+': '+httpResourceCallerRustType(parameter.type,{borrowedLifetime:borrowedText&&roots.has(parameter.name)})).join(', '),returns=httpResourceCallerRustType(row.returns,{borrowedLifetime:borrowedText});
  return (row.exported?'pub ':'')+(row.lazy?'async ':'')+'fn '+name(row.name)+generics+'('+parameters+') -> '+returns+' { '+emitHttpResourceCallerFlow(row.flow)+' }';
 }).join('\n')+'\n';
}
function translate(stage,input){
 const analysis=analyze(stage,input),pipeline=createRulePipeline([
  {phase:'language',rules:[
   {id:'javascript:check-actual-source-bound-http-resources-errors-and-cold-future-flow',apply:()=>JSON.stringify({schema:SCHEMA,functions:analysis.rows})},
   {id:'meta:serialize-reparse-and-freshly-recheck-complete-original-http-resource-source',apply:wire=>{const data=JSON.parse(wire),fresh=analyze(stage,input);if(data.schema!==SCHEMA||JSON.stringify(data.functions)!==JSON.stringify(fresh.rows)||fresh.source!==analysis.source)fail('complete fresh control semantic source association differs');fresh.context.current();return data;}},
  ]},
  {phase:'repository',rules:[{id:'router:emit-qualified-native-http-resource-calls-with-explicit-loans-and-cleanup',apply:data=>({meta:JSON.stringify(data),rust:emit(data.functions)})}]},
 ]),run=pipeline.run(null),rustConcrete=transportConcreteSyntaxSource(run.value.rust,{language:'Rust'}),rustSource=transportConcreteSyntaxMeta(rustConcrete.meta).source;
 const sourceRules=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:substitute-only-actual-native-parameter-annotations',apply:source=>({javascript:analysis.language==='JavaScript'?source:edit(source,analysis.erase),typescript:analysis.language==='TypeScript'?source:edit(source,analysis.annotate)})}]},
  {phase:'repository',rules:[{id:'router:retain-full-actual-caller-and-paired-target-CST-inverses',apply:targets=>({...targets,equations:transportConcreteSourceEquations([{before:analysis.source,after:targets.javascript,language:analysis.language},{before:analysis.source,after:targets.typescript,language:analysis.language}])})}]},
 ]).run(analysis.source),{javascript,typescript}=sourceRules.value;
 const targets=[['JavaScript',javascript],['TypeScript',typescript]].map(([language,source])=>{const row=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(row.meta).source!==source)fail('complete caller target CST differs');return {language,meta:row.meta};});analysis.context.current();
 return {schema:SCHEMA,meta:run.value.meta,rust:rustSource,javascript,typescript,checkedHttpResourceMeta:run.value.meta,concreteSyntax:analysis.concreteSyntax,rustConcreteSyntax:rustConcrete.meta,targetConcreteSyntax:targets,targetSourceEquations:sourceRules.value.equations,sourceRuleTrace:sourceRules.trace,trace:run.trace,mappings:analysis.rows.map(row=>({source:row.name,target:row.name,span:row.span,returns:row.returns})),sourcePath:analysis.context.sourcePath,runtimePath:analysis.context.runtimePath,nativeSourceInputs:analysis.context.nativeInputs,flowSourceInput:{path:analysis.context.flowRuntimePath,source:analysis.context.flowSource},sourceAuthority:false,semanticAuthority:false,nativeRustGrammarChecked:false,rustExecuted:false,receivingExecuted:false,crossInvocationCache:false,runtimeParity:false,wholeRouterSynchronization:false};
}
export function translateHttpResourceCallerJavaScript(source,input){return translate(prepareReverseConcreteSource(source),input);}
export function translateHttpResourceCallerTypeScript(source,input){return translate(prepareReverseConcreteSource(source,'TypeScript'),input);}
export function translateHttpResourceCallerConcreteSyntaxMeta(meta,input){return translate(parseReverseConcreteSource(meta),input);}
export function readHttpResourceCallerMeta(meta,source,input,{language='JavaScript'}={}){
 const analysis=analyze(prepareReverseConcreteSource(source,language),input),expected=JSON.stringify({schema:SCHEMA,functions:analysis.rows});if(meta!==expected)fail('complete current source and semantic meta differ');return JSON.parse(expected);
}
