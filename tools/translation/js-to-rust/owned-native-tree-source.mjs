// Native observations produce source DATA only. Admission requires the complete
// fresh receiving/native checks in owned-native-bulk-discovery.mjs. ALL UNRUN.
import {posix} from 'node:path';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {BOUNDED_JSON_RUNTIME_OPERATIONS} from './bounded-json-runtime-operations.mjs';
import {ownedJsonReaderOperation} from './owned-json-source.mjs';
import {ownedVectorJsonFieldOperation} from './owned-vector-json-fields.mjs';
import {ownedVectorTextScalarOperation} from './owned-vector-text-scalars.mjs';
import {ownedPlainData,ownedSourcePath} from './owned-vector-candidate-source.mjs';
import {projectNativePrimitiveVectorFunction} from './owned-native-vector-families.mjs';
export class UnsupportedNativeTreeProjection extends TypeError {
 constructor(message){super('Native source projection: '+message);this.name='UnsupportedNativeTreeProjection';}
}
const fail=message=>{throw new UnsupportedNativeTreeProjection(message);};
const nativeRustKeywords=new Set('as async await break const continue crate default do dyn else enum export extern false fn for function if impl import in let loop match mod move mut new null pub ref return self static struct super switch this throw trait true try type typeof undefined unsafe use var void where while with yield abstract become box final gen macro override priv unsized virtual'.split(' '));
const keywords=new Set('await break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield'.split(' '));
for(const name of nativeRustKeywords)keywords.add(name);
export const nativeProjectionIdentifier=name=>typeof name==='string'&&/^[a-z][a-z0-9_]*$/u.test(name)&&!name.startsWith('__ro')&&!keywords.has(name);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const owned=role=>role==='json'||role==='json-list-owned';
/** Neither this model nor its rules issue checked IR, loans or source authority. */
export function projectNativeTreeModule(input,options={}){
 const units=ownedPlainData(input),settings=ownedPlainData(options),{javascriptPath,typescriptPath,runtimeRoot}=settings;
 if(Object.keys(settings).sort().join('|')!=='javascriptPath|runtimeRoot|typescriptPath')fail('explicit complete projection paths required');
 for(const path of [javascriptPath,typescriptPath,runtimeRoot])ownedSourcePath(path);
 if(!javascriptPath.endsWith('.mjs')||!/\.(?:mts|ts)$/u.test(typescriptPath))fail('paired JavaScript and TypeScript module paths required');
 const imports=new Map(),typeImports=new Map(),allocated=new Set(),nativeTargets=new Map();let cells=0,sequence=0;
 const allocate=stem=>{let name=stem;while(allocated.has(name))name=stem+'_'+sequence++;allocated.add(name);return name;};
 const tick=depth=>{if(++cells>100000||depth>64)fail('complete module node/depth budget');};
 const relative=family=>{const path=posix.relative(posix.dirname(typescriptPath),runtimeRoot+'/'+family+'-runtime.mjs');return path.startsWith('.')?path:'./'+path;};
 const imported=(name,family,typeOnly=false)=>{const rows=typeOnly?typeImports:imports,key=family+':'+name;if(!rows.has(key))rows.set(key,{name,family,local:(imports.get(key)??typeImports.get(key))?.local??allocate('native_'+name)});return rows.get(key).local;};
 function type(role){
  if(['json','json-ref'].includes(role))return 'JsonValue';
  if(typeof role==='string'&&role.startsWith('vec:')&&(role.slice(4)==='bool'||primitiveBitwiseType(role.slice(4))))return 'readonly '+type(role.slice(4))+'[]';
  if(role==='json-list-owned')return 'readonly JsonValue[]';
  if(role==='unit')return 'void';if(role==='bool')return 'boolean';if(role==='str')return 'string';
  if(['u64','i64'].includes(role))return 'Parameters<typeof '+imported('json_macro_'+role,'json-macro',true)+'>[0]';
  const row=primitiveBitwiseType(role);if(row){const local=imported(row.alias,'primitive-operator',true);return local;}
  fail('explicit qualified public ABI needed for '+role);
 }
 function operation(name){
  const failure=nativeFailureEventOperation(name);if(failure)return failure;
  if(name.startsWith('source-call:')){const target=nativeTargets.get(name.slice('source-call:'.length));if(!target||!['primitive-scalar','primitive-expression-vector'].includes(target.kind)||target.returns!=='unit'&&target.returns!=='bool'&&!primitiveBitwiseType(target.returns)&&!(target.kind==='primitive-expression-vector'&&primitiveVectorResultRole(target.returns)))fail('actual complete primitive helper event target required');return {sourceCall:true,target,role:target.returns,arity:target.parameters.length};}
  for(const [key,row]of Object.entries(BOUNDED_JSON_RUNTIME_OPERATIONS)){
   const spelling=row.rust==='json_checked_copy'?'copy':row.rust==='json_checked_with_field'?'with-field':row.rust==='json_validate'?'validate':'build-'+row.rust.slice('json_build_'.length);
   if(name===spelling)return {name:key,family:'json-update',role:row.ret};
  }
  if(name==='index-usize')return {name:'router_field_json_index_or_null',family:'json-fields',role:'json-ref'};
  if(name==='index-str')return {name:'router_core_json_index_str',family:'json-update',role:'json-ref'};
  const families=[['reader:','json',ownedJsonReaderOperation],['predicate:','json',ownedJsonReaderOperation],['field:','json-fields',ownedVectorJsonFieldOperation],['text-scalar:','string-iterator',ownedVectorTextScalarOperation]];
  for(const [prefix,family,lookup]of families)if(name.startsWith(prefix)){const symbol=name.slice(prefix.length),row=lookup(symbol);if(row)return {name:symbol,family,role:row.ret};}
  fail('next qualified source operation rule needed: '+name);
 }
 function functionSource(unit){
  if(!nativeProjectionIdentifier(unit.name)||!Array.isArray(unit.parameters)||unit.parameters.length>32||unit.parameters.some(row=>!nativeProjectionIdentifier(row.name))||new Set(unit.parameters.map(row=>row.name)).size!==unit.parameters.length)fail('ordinary distinct actual parameter/function names required');
  if(unit.kind==='primitive-vector'){try{return projectNativePrimitiveVectorFunction(unit);}catch(error){if(error instanceof TypeError)fail(error.message);throw error;}}
  const parameters=unit.parameters.map(row=>row.name+': '+type(row.type));
  const initial=unit.parameters.flatMap((row,index)=>['json','json-ref'].includes(row.type)?[['validate',[['parameter',index]]]]:[]);
  function body(tree,inherited=[],known=new Map(),depth=0){
   tick(depth);if(!Array.isArray(tree)||tree.length!==2||!Array.isArray(tree[0])||tree[0].length>16384)fail('complete ordered native body required');
   const [events,terminal]=tree,prefix=inherited.length;
   if(events.length<prefix||!same(events.slice(0,prefix),inherited))fail('branch must retain its complete ordered effect prefix');
   let cursor=prefix;const names=new Map(known),uses=new Map(),literalDeclarations=[],descriptors=events.map(row=>{if(!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||!Array.isArray(row[1]))fail('exact native operation and argument list required');return operation(row[0]);});
   function references(node,atDepth=0){tick(atDepth);if(!Array.isArray(node))fail('closed symbolic expression required');if(node[0]==='effect'){if(node.length!==2||!Number.isSafeInteger(node[1])||node[1]<0||node[1]>=events.length)fail('in-range native effect origin required');uses.set(node[1],(uses.get(node[1])??0)+1);return;}if(node[0]==='if')return;for(let index=1;index<node.length;index++){const child=node[index];if(Array.isArray(child)){if(['vector','source-call','fixed-bitwise','fixed-method'].includes(node[0])&&index===({vector:1,'source-call':2,'fixed-bitwise':3,'fixed-method':3}[node[0]]))for(const entry of child)references(entry,atDepth+1);else references(child,atDepth+1);}}}
   for(let index=prefix;index<events.length;index++)for(const value of events[index][1])references(value);
   if(terminal?.[0]==='if')references(terminal[1]);else references(terminal);
   function expression(node,level=0){
    tick(level);if(!Array.isArray(node))fail('bounded symbolic expression required');const [kind,a,b,c,d]=node;const total=projectNativeTotalOperator(node,{expression:value=>expression(value,level+1),imported});if(total!==null)return total;
    if(kind==='parameter'){if(node.length!==2||!Number.isSafeInteger(a)||!unit.parameters[a])fail('actual parameter index required');return unit.parameters[a].name;}
    if(kind==='bool'&&typeof a==='boolean'&&node.length===2)return String(a);
    if(kind==='str'&&typeof a==='string'&&node.length===2&&!/\p{Surrogate}/u.test(a))return JSON.stringify(a);
    if(kind==='integer'&&primitiveBitwiseType(a)&&typeof b==='string'&&/^-?(?:0|[1-9][0-9]{0,38})$/u.test(b)&&node.length===3){const value=BigInt(b),row=primitiveBitwiseType(a);if(value<(row.signed?-BigInt(row.minimumAbs):0n)||value>BigInt(row.maximum))fail('integer outside original bounds');if(a!=='u64'){const name=allocate('native_scalar_'+sequence++);literalDeclarations.push('const '+name+': '+type(a)+' = '+b+'n;');return name;}return b+'n';}
    if(kind==='effect'){
     if(names.has(a))return names.get(a);if(a<cursor||uses.get(a)!==1||!owned(descriptors[a]?.role))fail('owned effect requires one ordered source consumer');
     const output=call(a,level+1);if(cursor!==a)fail('nested owned operands must preserve every preceding effect');cursor++;return output;
    }
    if(kind==='source-call'&&node.length===3){const target=nativeTargets.get(a);if(!target||!['primitive-scalar','primitive-expression-vector'].includes(target.kind)||!Array.isArray(b)||b.length!==target.parameters.length)fail('complete actual same-module helper source needed');return target.name+'('+b.map(value=>expression(value,level+1)).join(', ')+')';}
    if(kind==='not'&&node.length===2)return '(!'+expression(a,level+1)+')';
    if(['and','or'].includes(kind)&&node.length===3){const containsEffect=value=>Array.isArray(value)&&(value[0]==='effect'||value.slice(1).some(containsEffect));if(containsEffect(b))fail('conditional right effect placement needs an explicit control rule');return '('+expression(a,level+1)+(kind==='and'?' && ':' || ')+expression(b,level+1)+')';}
    if(kind==='compare'&&node.length===5){const op={eq:'===',ne:'!==',lt:'<',le:'<=',gt:'>',ge:'>='}[a];if(!op||!['bool','str'].includes(b)&&!primitiveBitwiseType(b))fail('explicit original comparison required');return '('+expression(c,level+1)+' '+op+' '+expression(d,level+1)+')';}
    if(kind==='choose'&&node.length===4)return '('+expression(a,level+1)+' ? '+expression(b,level+1)+' : '+expression(c,level+1)+')';
    if(kind==='some'&&node.length===2)return '('+expression(a,level+1)+'.$ === "Some")';
    if(kind==='payload'&&node.length===2)return expression(a,level+1)+'.field0';
    if(kind==='vector'&&node.length===2&&Array.isArray(a)&&a.length<=4096)return '['+a.map(value=>expression(value,level+1)).join(', ')+']';
    fail('next native symbolic expression rule needed: '+kind);
   }
   function call(index,level){const descriptor=descriptors[index],args=events[index][1].map(value=>expression(value,level+1));if(descriptor.failure)return projectNativeFailureCall(descriptor,args,{imported});if(descriptor.sourceCall){if(args.length!==descriptor.arity)fail('complete original helper event arity required');return descriptor.target.name+'('+args.join(', ')+')';}return imported(descriptor.name,descriptor.family)+'('+args.join(', ')+')';}
   const lines=[];
   if(depth===0){if(!same(events.slice(0,initial.length),initial))fail('actual JSON input validation prefix must match the receiving boundary');cursor=initial.length;}
   // Owned values remain inline so receiving variable-copy rules cannot invent
   // a second copy. The cursor rejects reordering, dropped or repeated effects.
   for(let index=cursor;index<events.length;index++){
    const descriptor=descriptors[index];if(owned(descriptor.role))continue;
    const output=call(index,depth+1);if(cursor!==index)fail('source emission would reorder a native effect');cursor++;
    if(descriptor.role==='unit')lines.push(output+';');else{const name=allocate('native_effect_'+sequence++),annotation=primitiveBitwiseType(descriptor.role)?': '+type(descriptor.role):'';names.set(index,name);lines.push('const '+name+annotation+' = '+output+';');}
   }
   if(terminal?.[0]==='if'){
    const condition=expression(terminal[1],depth+1);if(cursor!==events.length)fail('owned effects before a branch need a preserving local rule');
    const yes=body(terminal[2],events,names,depth+1),no=body(terminal[3],events,names,depth+1);lines.push('if ('+condition+') '+yes+' else '+no);
   }else if(terminal?.[0]==='unit'&&terminal.length===1&&unit.returns==='unit')lines.push('return;');else lines.push('return '+expression(terminal,depth+1)+';');
   if(cursor!==events.length)fail('every ordered effect must have one source execution');names.clear();uses.clear();return '{\n'+[...literalDeclarations,...lines].map(line=>'  '+line).join('\n')+'\n}';
  }
  return 'export function '+unit.name+'('+parameters.join(', ')+'): '+type(unit.returns)+' '+body(unit.tree);
 }
 try{
  if(!Array.isArray(units)||!units.length||units.length>4096)fail('bounded nonempty native units required');
  for(const unit of units){allocated.add(unit.name);if(unit.rust!==undefined){if(typeof unit.rust!=='string'||nativeTargets.has(unit.rust))fail('distinct actual native helper identity required');nativeTargets.set(unit.rust,unit);}if(Array.isArray(unit.parameters))for(const parameter of unit.parameters)allocated.add(parameter.name);}
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'native-tree:substitute-complete-ordered-scalar-json-control-source',apply:()=>units.map(functionSource).join('\n\n')}]},
   {phase:'repository',rules:[{id:'router:place-qualified-runtime-domains-in-paired-source-module',apply:body=>{
    const prelude=['import type {JsonValue} from '+JSON.stringify(relative('json-macro'))+';'];
    for(const row of imports.values())prelude.push('import { '+row.name+' as '+row.local+' } from '+JSON.stringify(relative(row.family))+';');
    for(const [key,row]of typeImports)if(!imports.has(key))prelude.push('import type { '+row.name+' as '+row.local+' } from '+JSON.stringify(relative(row.family))+';');
    const typescript=prelude.join('\n')+'\n\n'+body+'\n';if(Buffer.byteLength(typescript)>2097152)fail('complete source module byte bound');return {typescript,javascriptPath,typescriptPath,sourceAuthority:false,semanticAuthority:false,receivingExecuted:false,runtimeParity:false};
   }}]},
  ]).run(null);return {...run.value,trace:run.trace};
 }finally{imports.clear();typeImports.clear();allocated.clear();nativeTargets.clear();}
}

import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';

import {projectNativeTotalOperator} from './owned-native-total-operators.mjs';

import {nativeFailureEventOperation,projectNativeFailureCall} from './owned-native-division-operators.mjs';

import {primitiveVectorResultRole} from './owned-source-effect-calls.mjs';
