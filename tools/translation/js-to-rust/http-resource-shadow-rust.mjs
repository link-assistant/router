// Complete canonical source proposals are independently checked before return.
import {posix} from 'node:path';
import {sourceItems} from '../rust-structure.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {projectHttpResourceRustFunctions} from './http-resource-rust-projection.mjs';
import {readHttpResourceRustFunction,UnsupportedOwnedRustSource} from './http-resource-rust-syntax.mjs';
import {translateHttpResourceCallerJavaScript} from './http-resource-callers.mjs';
import {ownedPlainData,ownedSourcePath} from './owned-cancellation-source.mjs';
const fail=message=>{throw new UnsupportedOwnedRustSource('Filesystem control: '+message);};
const forbidden=new Set('Ok Err Some None Result Option String Vec std tokio true false'.split(' '));
function name(value){if(typeof value!=='string'||! /^[A-Za-z_][A-Za-z0-9_]*$/u.test(value)||value.startsWith('__ro')||forbidden.has(value))fail('ordinary unshadowed source binding required');return value;}
function project(functions,options){return projectHttpResourceRustFunctions(functions,options);}
export function translateHttpResourceShadowCallerRust(source,input){
 const data=ownedPlainData(input),keys=['sourcePath','javascriptPath','files','runtimeRoot','declarationRoot'];if(Object.keys(data).sort().join('\0')!==keys.sort().join('\0'))fail('complete closed original Rust source input required');
 const sourcePath=ownedSourcePath(data.sourcePath),javascriptPath=ownedSourcePath(data.javascriptPath);ownedSourcePath(data.runtimeRoot);ownedSourcePath(data.declarationRoot);
 if(typeof source!=='string'||source.length>2097152||!sourcePath.endsWith('.rs')||!javascriptPath.endsWith('.mjs')||sourcePath===javascriptPath)fail('bounded complete original Rust and receiving JS paths required');
 if(!Array.isArray(data.files)||data.files.length>4096||data.files.filter(row=>row.path===sourcePath&&row.source===source).length!==1||new Set(data.files.map(row=>row.path)).size!==data.files.length)fail('complete unique authoritative native source snapshot required');let concrete,projection,normalizedSource=source,lexicalBindings=null,normalizationRefusal=null;
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'rust:serialize-reparse-complete-original-http-resource-CST',apply:()=>{concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete original Rust CST differs');try{lexicalBindings=normalizeHttpResourceRustBindings(source);normalizedSource=lexicalBindings.after;}catch(error){if(!(error instanceof TypeError))throw error;normalizationRefusal=error.message;}const items=sourceItems(normalizedSource).filter(row=>row.term!=='comment');if(!items.length||items.length>4096||items.some(row=>row.term!=='fn'))fail('complete ordinary native HTTP function module required');return items.map(row=>readHttpResourceRustFunction(normalizedSource.slice(row.start,row.end)));}},
   {id:'rust:substitute-bound-resources-results-and-control-into-source-proposals',apply:functions=>{projection=project(functions,{javascriptPath,runtimeRoot:data.runtimeRoot,annotationHints:lexicalBindings?.annotations??[],genericArgumentHints:lexicalBindings?.genericCalls??[]});return projection.source;}},
   {id:'meta:freshly-check-whole-JS-resource-flow-and-reparsed-http-program',apply:javascript=>translateHttpResourceCallerJavaScript(javascript,{sourcePath:javascriptPath,runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot,files:data.files.filter(row=>row.path!==javascriptPath).concat([{path:javascriptPath,source:javascript}])})},
   {id:'meta:check-every-actual-native-local-type-against-the-complete-fresh-body',apply:result=>{requireHttpResourceNativeLocalTypes(result.meta,lexicalBindings);return result;}},
   {id:'meta:check-every-original-native-generic-argument-against-the-fresh-call',apply:result=>{requireHttpResourceNativeGenericArguments(result.meta,lexicalBindings);return result;}},
   {id:'rust:require-complete-authoritative-source-reproduction',apply:result=>{if(!sameRustSourceSyntax(normalizedSource,result.rust))fail('fresh checked HTTP proposal does not reproduce the complete normalized authoritative Rust source');return result;}},
  ]},
  {phase:'repository',rules:[{id:'router:retain-whole-http-resource-source-and-inverse-history',apply:result=>({...result,originalRust:source,httpResourceRustSourceHistory:{sourcePath,javascriptPath,source,normalizedSource,lexicalBindings,normalizationRefusal,concreteSyntax:concrete.meta,projection,originalJavaScript:data.files.find(row=>row.path===javascriptPath)?.source??null,equation:transportConcreteSourceEquations([{before:source,after:result.rust,language:'Rust'}])[0],sourceAuthority:false,semanticAuthority:false},runtimeParity:false,wholeRouterSynchronization:false,rustExecuted:false})}]},
 ]).run(null);return {...run.value,httpResourceRustRuleTrace:run.trace};
}

import {normalizeHttpResourceRustBindings} from './http-resource-native-bindings.mjs';

import {requireHttpResourceNativeLocalTypes} from './http-resource-native-local-types.mjs';

import {requireHttpResourceNativeGenericArguments} from './http-resource-native-generic-arguments.mjs';
