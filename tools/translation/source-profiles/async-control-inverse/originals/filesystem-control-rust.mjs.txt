// Complete canonical source proposals are independently checked before return.
import {posix} from 'node:path';
import {sourceItems} from '../rust-structure.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {FILESYSTEM_EFFECT_CONTRACTS} from '../extensions/filesystem-effects-contracts.mjs';
import {readOwnedRustFunction,UnsupportedOwnedRustSource} from './filesystem-control-rust-syntax.mjs';
import {translateFilesystemControlJavaScript} from './filesystem-control.mjs';
const fail=message=>{throw new UnsupportedOwnedRustSource('Filesystem control: '+message);};
const forbidden=new Set('Ok Err Some None Result Option String Vec std tokio true false'.split(' '));
function name(value){if(typeof value!=='string'||! /^[A-Za-z_][A-Za-z0-9_]*$/u.test(value)||value.startsWith('__ro')||forbidden.has(value))fail('ordinary unshadowed source binding required');return value;}
function project(functions,{javascriptPath,runtimePath}){
 const imports=new Map(),used=new Set();let cells=0,sequence=0;
 const tick=depth=>{if(++cells>100000||depth>160)fail('complete effect projection source budget exceeded');};
 function imported(id){if(!imports.has(id)){let local;do{local='native_effect_'+sequence++;}while(used.has(local));used.add(local);imports.set(id,local);}return imports.get(id);}
 function reserve(block,depth=0){tick(depth);for(const row of block.statements){if(row.kind==='let'&&row.name!=='_')used.add(name(row.name));if(row.kind==='if'){reserve(row.yes,depth+1);reserve(row.no,depth+1);}}}
 for(const fn of functions){used.add(name(fn.name));for(const parameter of fn.parameters)used.add(name(parameter.name));reserve(fn.body);}
 function condition(node,parameters,depth=0){
  tick(depth);if(node.kind==='boolean')return String(node.value);if(node.kind==='name'&&parameters.get(node.name)==='bool')return name(node.name);if(node.kind==='not')return '(!'+condition(node.value,parameters,depth+1)+')';
  if(node.kind==='binary'&&['&&','||'].includes(node.op))return '('+condition(node.left,parameters,depth+1)+' '+node.op+' '+condition(node.right,parameters,depth+1)+')';fail('conditional source needs actual primitive Boolean bindings');
 }
 function operand(node,parameters,locals){
  if(node?.kind!=='name')fail('canonical effect operand requires an actual original binding');if(parameters.has(node.name))return name(node.name);if(locals.has(node.name))return locals.get(node.name)+'.field0';fail('unknown or noncanonical effect operand');
 }
 function operation(node,parameters,locals,asynchronous){
  let awaited=false;if(node?.kind==='field'&&node.name==='await'){awaited=true;node=node.value;}
  if(node?.kind!=='call')fail('canonical direct effect call required');const row=FILESYSTEM_EFFECT_CONTRACTS.find(row=>row.rustPath[1]==='fs'&&row.rustPath.join('::')===node.path);
  if(!row||row.async!==awaited||row.async&&!asynchronous||node.args.length!==row.params.length)fail('actual qualified filesystem operation/await differs');
  return (awaited?'await ':'')+imported(row.id)+'('+node.args.map(value=>operand(value,parameters,locals)).join(', ')+')';
 }
 function body(block,parameters,outer,asynchronous,depth=0){
  tick(depth);const locals=new Map(outer),lines=[];let terminal=false;
  for(let at=0;at<block.statements.length;at++){
   const statement=block.statements[at];tick(depth+1);if(terminal)fail('effect statement after a complete source return');
   if(statement.kind==='let'){
    if(statement.mutable||statement.value?.kind!=='effect-try')fail('canonical immutable propagated effect binding required');let local=statement.name;
    if(local==='_'){do{local='native_unused_'+sequence++;}while(used.has(local));used.add(local);}else{name(local);if(locals.has(local)||parameters.has(local))fail('effect source local shadow requires a separate rule');used.add(local);}
    const value=operation(statement.value.value,parameters,locals,asynchronous);lines.push('const '+local+' = '+value+';','if ('+local+'.$ === "Err") { return '+local+'; }');locals.set(statement.name,local);continue;
   }
   if(statement.kind==='if'&&at===block.statements.length-1&&!block.tail){lines.push('if ('+condition(statement.condition,parameters,depth+1)+') '+body(statement.yes,parameters,locals,asynchronous,depth+1)+' else '+body(statement.no,parameters,locals,asynchronous,depth+1));terminal=true;continue;}
   fail('effect statement requires its canonical complete source equation');
  }
  if(block.tail){
   if(terminal)fail('effect source contains competing tails');const tail=block.tail;
   if(tail.kind==='call'&&tail.path==='Ok'&&tail.args.length===1&&tail.args[0].kind==='name'&&locals.has(tail.args[0].name))lines.push('return '+locals.get(tail.args[0].name)+';');else lines.push('return '+operation(tail,parameters,locals,asynchronous)+';');terminal=true;
  }
  if(!terminal)fail('every original effect source path needs a complete native Result return');return '{\n'+lines.join('\n')+'\n}';
 }
 const functionsText=functions.map(fn=>{
  const parameters=new Map(fn.parameters.map(parameter=>[name(parameter.name),parameter.type==='&str'?'str':parameter.type==='bool'?'bool':fail('only original str/Boolean input domains are supported')]));
  if(parameters.size!==fn.parameters.length)fail('duplicate original function inputs');const inner=body(fn.body,parameters,new Map(),fn.asynchronous),docs=fn.parameters.map(parameter=>' * @param {'+(parameters.get(parameter.name)==='bool'?'boolean':'string')+'} '+parameter.name);
  return (docs.length?'/**\n'+docs.join('\n')+'\n */\n':'')+(fn.exported?'export ':'')+'function '+name(fn.name)+'('+fn.parameters.map(row=>row.name).join(', ')+') '+(fn.asynchronous?'{ return '+imported('deferFilesystemFlow')+'(async () => '+inner+'); }':inner);
 }).join('\n\n');
 const relative=posix.relative(posix.dirname(javascriptPath),runtimePath),edge=relative.startsWith('.')?relative:'./'+relative,source=[...imports].map(([id,local])=>'import { '+id+' as '+local+' } from '+JSON.stringify(edge)+';').join('\n')+'\n\n'+functionsText+'\n';if(source.length>2097152)fail('whole effect source proposal exceeds original bound');return {source,imports:[...imports],sourceAuthority:false,semanticAuthority:false};
}
export function translateFilesystemControlRust(source,{sourcePath,javascriptPath,runtimePath,runtimeSource}={}){
 const ordinary=value=>typeof value==='string'&&value.length>0&&!value.startsWith('/')&&!value.includes('\\')&&!value.split('/').some(part=>!part||part==='.'||part==='..');
 if(typeof source!=='string'||source.length>2097152||!ordinary(sourcePath)||!sourcePath.endsWith('.rs')||!ordinary(javascriptPath)||!javascriptPath.endsWith('.mjs')||!ordinary(runtimePath))fail('bounded complete original Rust and receiving repository-relative paths required');let concrete,projection;
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'rust:serialize-reparse-complete-original-filesystem-control-CST',apply:()=>{concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete original Rust CST differs');const items=sourceItems(concrete.source).filter(row=>row.term!=='comment');if(!items.length||items.length>4096||items.some(row=>row.term!=='fn'))fail('complete ordinary native effect function module required');return items.map(row=>readOwnedRustFunction(source.slice(row.start,row.end)));}},
   {id:'rust:substitute-bound-effects-propagation-and-Boolean-control-into-source-proposals',apply:functions=>{projection=project(functions,{javascriptPath,runtimePath});return projection.source;}},
   {id:'meta:freshly-check-native-JS-flow-and-independent-Rust-semantic-program',apply:javascript=>translateFilesystemControlJavaScript(javascript,{sourcePath:javascriptPath,runtimePath,runtimeSource})},
   {id:'rust:require-complete-authoritative-source-reproduction',apply:result=>{if(!sameRustSourceSyntax(source,result.rust))fail('fresh checked effect proposal does not reproduce the complete authoritative Rust source');return result;}},
  ]},
  {phase:'repository',rules:[{id:'router:retain-whole-effect-source-and-inverse-history',apply:result=>({...result,originalRust:source,filesystemRustSourceHistory:{sourcePath,javascriptPath,source,concreteSyntax:concrete.meta,projection,equation:transportConcreteSourceEquations([{before:source,after:result.rust,language:'Rust'}])[0],sourceAuthority:false,semanticAuthority:false},runtimeParity:false,wholeRouterSynchronization:false,rustExecuted:false})}]},
 ]).run(null);return {...run.value,filesystemRustRuleTrace:run.trace};
}
