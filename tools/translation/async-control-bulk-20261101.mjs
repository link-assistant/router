// Source-only bulk draft. Operation descriptions are DATA; every proposal enters
// the existing full caller checker in JS, TS and canonical Rust directions.
import {posix} from 'node:path';
import {types} from 'node:util';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {sameRustSourceSyntax} from './rust-syntax-cells.mjs';
import {asyncControlCallerName} from './js-to-rust/async-control-caller-flow.mjs';
import {translateAsyncControlCallerJavaScript,translateAsyncControlCallerTypeScript,readAsyncControlCallerMeta} from './js-to-rust/async-control-callers.mjs';
import {translateAsyncControlCallerRust} from './js-to-rust/async-control-rust.mjs';

const fail=message=>{throw new TypeError('Async control family proposal: '+message);};
const token='Parameters<typeof controlSleep>[1]',receiver='Parameters<typeof controlReceive>[0]';
const bindings=Object.freeze({
 controlSleep:'router_async_sleep',controlDeadline:'router_async_with_deadline',
 controlChannel:'router_async_channel',controlSend:'router_async_send',
 controlReceive:'router_async_receive',controlClose:'router_async_close',
 controlDispose:'router_async_dispose',controlWait:'router_cancel_wait',
 controlSet:'router_cancel_set',controlIsSet:'router_cancel_is_set',
});
// Complete caller bodies share one operation description across JS and TS. The
// actual checker authenticates imports, annotations, cleanup and cold effects;
// these text descriptions cannot grant any of those permissions.
const descriptions=[
 {id:'exchange',parameters:[['encoded','string'],['token',token]],body:`return deferControl(async () => {
 const pair = controlChannel(1n);
 if (pair.$ === 'Err') { return pair; }
 const [sender, receiver] = pair.field0;
 const sent = await controlSend(sender, encoded, token);
 if (sent.$ === 'Err') { controlDispose(receiver); return sent; }
 controlClose(receiver);
 const received = await controlReceive(receiver, token);
 if (received.$ === 'Err') { controlDispose(receiver); return received; }
 controlDispose(receiver);
 return received;
});`},
 {id:'receiveBeforeDeadline',parameters:[['receiver',receiver],['token',token]],body:`return deferControl(async () => {
 return await controlDeadline(1000n, token, async child => {
  return await controlReceive(receiver, child);
 });
});`},
 {id:'closeAndDrain',parameters:[['receiver',receiver],['token',token]],body:`return deferControl(async () => {
 controlClose(receiver);
 return await controlReceive(receiver, token);
});`},
 {id:'waitThenSleep',parameters:[['token',token]],body:`return deferControl(async () => {
 await controlWait(token);
 return await controlSleep(0n, token);
});`},
 {id:'signalAndObserve',parameters:[['token',token]],body:`controlSet(token);
 return controlIsSet(token);`},
];
export const ASYNC_CONTROL_BULK_20261101_OPERATIONS=Object.freeze(descriptions.map(row=>Object.freeze({
 ...row,parameters:Object.freeze(row.parameters.map(parameter=>Object.freeze(parameter))),
 sourceAuthority:false,semanticAuthority:false,
})));
function ordinaryRecord(value,allowed){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary own-data record required');
 for(const key of Reflect.ownKeys(value)){const field=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!allowed.includes(key)||!Object.hasOwn(field,'value'))fail('unknown or accessor field');}
 return value;
}
function path(value,suffix){
 if(typeof value!=='string'||!value.endsWith(suffix)||/[\\\0:]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('complete repository-relative source path required');
 return value;
}
function edge(from,to){const relative=posix.relative(posix.dirname(from),to);return relative.startsWith('.')?relative:'./'+relative;}
function select(input){
 if(!Array.isArray(input)||types.isProxy(input)||Object.getPrototypeOf(input)!==Array.prototype||input.length<1||input.length>descriptions.length)fail('bounded dense operation selection required');
 if(Reflect.ownKeys(input).length!==input.length+1)fail('dense own operation array required');
 const seen=new Set(),names=new Set();return Array.from({length:input.length},(_,index)=>{
  const field=Object.getOwnPropertyDescriptor(input,String(index));if(!field||!Object.hasOwn(field,'value'))fail('own operation data required');
  const row=ordinaryRecord(field.value,['operation','name']);if(!Object.hasOwn(row,'operation')||!Object.hasOwn(row,'name'))fail('operation and caller name required');
  const description=descriptions.find(value=>value.id===row.operation);if(!description||seen.has(row.operation))fail('unique supported operation required');
  const name=asyncControlCallerName(row.name);if(names.has(name)||Object.hasOwn(bindings,name)||name==='deferControl'||descriptions.some(value=>value.parameters.some(parameter=>parameter[0]===name)))fail('caller names must not compete with imported or parameter bindings');
  seen.add(row.operation);names.add(name);return {description,name};
 });
}
function source(rows,language,sourcePath,runtimePath){
 const flowPath=posix.dirname(runtimePath)+'/extensions/filesystem-effects-runtime.mjs';
 const imports='import { '+Object.entries(bindings).map(([local,original])=>original+' as '+local).join(', ')+' } from '+JSON.stringify(edge(sourcePath,runtimePath))+';\n'+
 'import { deferFilesystemFlow as deferControl } from '+JSON.stringify(edge(sourcePath,flowPath))+';\n';
 return imports+rows.map(({description:row,name})=>{
  const docs=row.parameters.map(([parameter,type])=>' * @param {'+type+'} '+parameter).join('\n');
  return (language==='JavaScript'?'/**\n'+docs+'\n */\n':'')+'export function '+name+'('+row.parameters.map(([parameter,type])=>parameter+(language==='TypeScript'?': '+type:'')).join(', ')+') {\n'+row.body+'\n}\n';
 }).join('\n');
}
function concrete(source,language){const transported=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(transported.meta).source!==source)fail('complete serialized/reparsed CST differs');return transported.meta;}
/** One synchronous operation; no source, owner, verdict or failure cache. */
export function proposeAsyncControlBulk20261101(input){
 ordinaryRecord(input,['operations','javascriptPath','typescriptPath','rustPath','runtimePath','runtimeSource','nativeRootSource','nativeSource']);
 for(const key of ['operations','javascriptPath','typescriptPath','rustPath','runtimePath','runtimeSource','nativeRootSource','nativeSource'])if(!Object.hasOwn(input,key))fail('complete source input required: '+key);
 const rows=select(input.operations),javascriptPath=path(input.javascriptPath,'.mjs'),typescriptPath=path(input.typescriptPath,'.mts'),rustPath=path(input.rustPath,'.rs'),runtimePath=path(input.runtimePath,'/async-control-runtime.mjs');
 if(typescriptPath!==javascriptPath.replace(/\.mjs$/u,'.mts'))fail('paired JS/TS paths must share the same directory and stem');
 const options=sourcePath=>({sourcePath,runtimePath,runtimeSource:input.runtimeSource,nativeRootSource:input.nativeRootSource,nativeSource:input.nativeSource});
 const proposed={JavaScript:source(rows,'JavaScript',javascriptPath,runtimePath),TypeScript:source(rows,'TypeScript',typescriptPath,runtimePath)};
 const result=createRulePipeline([
  {phase:'language',rules:[
   {id:'language:transport-complete-paired-caller-source-CST',apply:()=>({JavaScript:concrete(proposed.JavaScript,'JavaScript'),TypeScript:concrete(proposed.TypeScript,'TypeScript')})},
   {id:'language:freshly-check-whole-cold-resource-control-in-both-source-languages',apply:cst=>({cst,javascript:translateAsyncControlCallerJavaScript(proposed.JavaScript,options(javascriptPath)),typescript:translateAsyncControlCallerTypeScript(proposed.TypeScript,options(typescriptPath))})},
   {id:'language:reparse-meta-and-reproduce-complete-native-caller-inverse',apply:value=>{
    readAsyncControlCallerMeta(value.javascript.meta,proposed.JavaScript,options(javascriptPath));
    readAsyncControlCallerMeta(value.typescript.meta,proposed.TypeScript,options(typescriptPath),{language:'TypeScript'});
    if(!sameRustSourceSyntax(value.javascript.rust,value.typescript.rust))fail('paired whole native callers differ');
    const reverse=translateAsyncControlCallerRust(value.javascript.rust,{...options(rustPath),javascriptPath});
    if(!sameRustSourceSyntax(reverse.rust,value.javascript.rust))fail('whole canonical Rust inverse differs');
    // Replay both reverse target bodies. Their imports and resource types must
    // independently resolve through the original checker, not a copied verdict.
    const reverseJS=translateAsyncControlCallerJavaScript(reverse.javascript,options(javascriptPath));
    const reverseTS=translateAsyncControlCallerTypeScript(reverse.typescript,options(typescriptPath));
    if(!sameRustSourceSyntax(reverseJS.rust,value.javascript.rust)||!sameRustSourceSyntax(reverseTS.rust,value.javascript.rust))fail('reverse target recheck differs');
    return {...value,reverse,reverseJS,reverseTS};
   }},
  ]},
  {phase:'repository',rules:[{id:'repository:retain-all-full-source-proposals-inverses-and-private-checker-results',apply:value=>({
   schema:'router-async-control-bulk-20261101-v1',operations:rows.map(row=>({operation:row.description.id,name:row.name})),
   paths:{JavaScript:javascriptPath,TypeScript:typescriptPath,Rust:rustPath},
   sources:{...proposed,Rust:value.javascript.rust},checked:value,
   equations:transportConcreteSourceEquations([
    {before:proposed.JavaScript,after:value.reverse.javascript,language:'JavaScript'},
    {before:proposed.TypeScript,after:value.reverse.typescript,language:'TypeScript'},
    {before:value.javascript.rust,after:value.reverse.rust,language:'Rust'},
   ]),sourceAuthority:false,semanticAuthority:false,runtimeParity:false,rustExecuted:false,receivingExecuted:false,wholeRouterSynchronization:false,crossInvocationCache:false,
  })}]},
 ]).run(null);
 // A last complete fresh check closes this invocation after packaging too.
 readAsyncControlCallerMeta(result.value.checked.javascript.meta,proposed.JavaScript,options(javascriptPath));
 readAsyncControlCallerMeta(result.value.checked.typescript.meta,proposed.TypeScript,options(typescriptPath),{language:'TypeScript'});
 return {...result.value,trace:result.trace};
}
