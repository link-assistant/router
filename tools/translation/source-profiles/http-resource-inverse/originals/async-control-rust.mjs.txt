// Complete canonical source proposals are independently checked before return.
import {posix} from 'node:path';
import {sourceItems} from '../rust-structure.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {projectAsyncControlRustFunctions} from './async-control-rust-projection.mjs';
import {readAsyncControlRustFunction,UnsupportedOwnedRustSource} from './async-control-rust-syntax.mjs';
import {translateAsyncControlCallerJavaScript} from './async-control-callers.mjs';
const fail=message=>{throw new UnsupportedOwnedRustSource('Filesystem control: '+message);};
const forbidden=new Set('Ok Err Some None Result Option String Vec std tokio true false'.split(' '));
function name(value){if(typeof value!=='string'||! /^[A-Za-z_][A-Za-z0-9_]*$/u.test(value)||value.startsWith('__ro')||forbidden.has(value))fail('ordinary unshadowed source binding required');return value;}
function project(functions,options){return projectAsyncControlRustFunctions(functions,options);}
export function translateAsyncControlCallerRust(source,{sourcePath,javascriptPath,runtimePath,runtimeSource,nativeRootSource,nativeSource}={}){
 const ordinary=value=>typeof value==='string'&&value.length>0&&!value.startsWith('/')&&!value.includes('\\')&&!value.split('/').some(part=>!part||part==='.'||part==='..');
 if(typeof source!=='string'||source.length>2097152||!ordinary(sourcePath)||!sourcePath.endsWith('.rs')||!ordinary(javascriptPath)||!javascriptPath.endsWith('.mjs')||!ordinary(runtimePath))fail('bounded complete original Rust and receiving repository-relative paths required');let concrete,projection;
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'rust:serialize-reparse-complete-original-async-control-CST',apply:()=>{concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete original Rust CST differs');const items=sourceItems(concrete.source).filter(row=>row.term!=='comment');if(!items.length||items.length>4096||items.some(row=>row.term!=='fn'))fail('complete ordinary native effect function module required');return items.map(row=>readAsyncControlRustFunction(source.slice(row.start,row.end)));}},
   {id:'rust:substitute-bound-effects-propagation-and-Boolean-control-into-source-proposals',apply:functions=>{projection=project(functions,{javascriptPath,runtimePath});return projection.source;}},
   {id:'meta:freshly-check-native-JS-resource-flow-and-reparsed-control-program',apply:javascript=>translateAsyncControlCallerJavaScript(javascript,{sourcePath:javascriptPath,runtimePath,runtimeSource,nativeRootSource,nativeSource})},
   {id:'rust:require-complete-authoritative-source-reproduction',apply:result=>{if(!sameRustSourceSyntax(source,result.rust))fail('fresh checked effect proposal does not reproduce the complete authoritative Rust source');return result;}},
  ]},
  {phase:'repository',rules:[{id:'router:retain-whole-control-source-and-inverse-history',apply:result=>({...result,originalRust:source,asyncControlRustSourceHistory:{sourcePath,javascriptPath,source,concreteSyntax:concrete.meta,projection,equation:transportConcreteSourceEquations([{before:source,after:result.rust,language:'Rust'}])[0],sourceAuthority:false,semanticAuthority:false},runtimeParity:false,wholeRouterSynchronization:false,rustExecuted:false})}]},
 ]).run(null);return {...run.value,asyncControlRustRuleTrace:run.trace};
}
