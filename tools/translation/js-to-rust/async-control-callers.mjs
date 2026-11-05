// A separate source-bound reverse lane for standard filesystem effect wrappers.
// Existing portable/owned APIs retain their original admission domains.
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
import {types} from 'node:util';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {prepareReverseConcreteSource,parseReverseConcreteSource} from './concrete-source.mjs';
import {asyncControlCallerContract,asyncControlCallerRustType,checkAsyncControlCallerFlow,emitAsyncControlCallerFlow} from './async-control-caller-flow.mjs';
import {captureAsyncControlCallerInputs,analyzeAsyncControlCallerSource} from './async-control-caller-source.mjs';


import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';

const RUNTIME=new URL('../async-control-runtime.mjs',import.meta.url);
const SCHEMA='router-async-control-callers-v1';
const reserved=new Set('as async await break const continue crate default do dyn else enum export extern false fn for function if impl import in let loop match mod move mut new null pub ref return self static struct super switch this throw trait true try type typeof undefined unsafe use var void where while with yield std tokio'.split(' '));
const fail=message=>{throw new TypeError('Reverse filesystem effects: '+message);};
function path(value){if(typeof value!=='string'||!value||value.startsWith('/')||value.includes('\\')||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('repository-relative ordinary source path required');return value;}
function own(value,key){if(!value||typeof value!=='object'||types.isProxy(value))fail('ordinary input record required');const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value'))fail('own data field required: '+key);return field.value;}
function name(value){if(typeof value!=='string'||!/^[_a-zA-Z][_a-zA-Z0-9]*$/u.test(value)||reserved.has(value)||value.startsWith('__ro_'))fail('portable unshadowed identifier required');return value;}
function options(input){return captureAsyncControlCallerInputs(input);}
function contract(id){const row=asyncControlCallerContract(id);if(!row)fail('unregistered control operation');return row;}
function rustResult(row){return asyncControlCallerRustType(row.ret);}
function flow(...args){return checkAsyncControlCallerFlow(...args);}
function emitFlow(value){return emitAsyncControlCallerFlow(value);}
function analyze(stage,input){return analyzeAsyncControlCallerSource(stage,input);}
function edit(source,edits){let value=source,last=source.length+1;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>=last)fail('overlapping native type selections');value=value.slice(0,row.span[0])+row.replacement+value.slice(row.span[1]);last=row.span[0];}return value;}
function emit(rows){
 return rows.map(row=>{
  const borrowedText=row.returns==='str',generics=borrowedText?"<'a>":'',parameters=row.parameters.map(parameter=>name(parameter.name)+': '+(borrowedText&&parameter.type==='str'?"&'a str":asyncControlCallerRustType(parameter.type))).join(', '),returns=borrowedText?"&'a str":asyncControlCallerRustType(row.returns);
  return (row.exported?'pub ':'')+(row.lazy?'async ':'')+'fn '+name(row.name)+generics+'('+parameters+') -> '+returns+' { '+emitAsyncControlCallerFlow(row.flow)+' }';
 }).join('\n')+'\n';
}
function translate(stage,input){
 const analysis=analyze(stage,input),pipeline=createRulePipeline([
  {phase:'language',rules:[
   {id:'javascript:check-actual-source-bound-resource-control-and-cold-future-flow',apply:()=>JSON.stringify({schema:SCHEMA,functions:analysis.rows})},
   {id:'meta:serialize-reparse-and-freshly-recheck-complete-original-control-source',apply:wire=>{const data=JSON.parse(wire),fresh=analyze(stage,input);if(data.schema!==SCHEMA||JSON.stringify(data.functions)!==JSON.stringify(fresh.rows)||fresh.source!==analysis.source)fail('complete fresh control semantic source association differs');fresh.context.current();return data;}},
  ]},
  {phase:'repository',rules:[{id:'router:emit-qualified-native-control-calls-with-explicit-loans-and-cleanup',apply:data=>({meta:JSON.stringify(data),rust:emit(data.functions)})}]},
 ]),run=pipeline.run(null),rustConcrete=transportConcreteSyntaxSource(run.value.rust,{language:'Rust'}),rustSource=transportConcreteSyntaxMeta(rustConcrete.meta).source;
 const sourceRules=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:substitute-only-actual-native-parameter-annotations',apply:source=>({javascript:analysis.language==='JavaScript'?source:edit(source,analysis.erase),typescript:analysis.language==='TypeScript'?source:edit(source,analysis.annotate)})}]},
  {phase:'repository',rules:[{id:'router:retain-full-actual-caller-and-paired-target-CST-inverses',apply:targets=>({...targets,equations:transportConcreteSourceEquations([{before:analysis.source,after:targets.javascript,language:analysis.language},{before:analysis.source,after:targets.typescript,language:analysis.language}])})}]},
 ]).run(analysis.source),{javascript,typescript}=sourceRules.value;
 const targets=[['JavaScript',javascript],['TypeScript',typescript]].map(([language,source])=>{const row=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(row.meta).source!==source)fail('complete caller target CST differs');return {language,meta:row.meta};});analysis.context.current();
 return {schema:SCHEMA,meta:run.value.meta,rust:rustSource,javascript,typescript,checkedControlMeta:run.value.meta,concreteSyntax:analysis.concreteSyntax,rustConcreteSyntax:rustConcrete.meta,targetConcreteSyntax:targets,targetSourceEquations:sourceRules.value.equations,sourceRuleTrace:sourceRules.trace,trace:run.trace,mappings:analysis.rows.map(row=>({source:row.name,target:row.name,span:row.span,returns:row.returns})),sourcePath:analysis.context.sourcePath,runtimePath:analysis.context.runtimePath,nativeSourceInputs:analysis.context.nativeInputs,flowSourceInput:{path:analysis.context.flowRuntimePath,source:analysis.context.flowSource},sourceAuthority:false,semanticAuthority:false,nativeRustGrammarChecked:false,rustExecuted:false,receivingExecuted:false,crossInvocationCache:false,runtimeParity:false,wholeRouterSynchronization:false};
}
export function translateAsyncControlCallerJavaScript(source,input){return translate(prepareReverseConcreteSource(source),input);}
export function translateAsyncControlCallerTypeScript(source,input){return translate(prepareReverseConcreteSource(source,'TypeScript'),input);}
export function translateAsyncControlCallerConcreteSyntaxMeta(meta,input){return translate(parseReverseConcreteSource(meta),input);}
export function readAsyncControlCallerMeta(meta,source,input,{language='JavaScript'}={}){
 const analysis=analyze(prepareReverseConcreteSource(source,language),input),expected=JSON.stringify({schema:SCHEMA,functions:analysis.rows});if(meta!==expected)fail('complete current source and semantic meta differ');return JSON.parse(expected);
}
