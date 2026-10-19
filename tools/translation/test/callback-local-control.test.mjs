import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {translateSource,translateSourceConcreteSyntaxMeta} from '../translate.mjs';
import {createConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

let vector=0;
function retain(label,value){
  const root=process.env.ROUTER_CALLBACK_LOCAL_CONTROL_VECTOR_DIR;
  if(root){mkdirSync(root,{recursive:true});writeFileSync(root+'/'+String(++vector).padStart(3,'0')+'-'+label+'.json',JSON.stringify(value,(_,item)=>typeof item==='bigint'?{$bigint:String(item)}:item instanceof Map?{$map:[...item]}:item)+'\n',{flag:'wx'});}
}
function outcome(action){try{return {value:action()};}catch(error){const field=error&&typeof error==='object'?Object.getOwnPropertyDescriptor(error,'message'):null;return {error:{message:field&&Object.hasOwn(field,'value')?field.value:'non-data error'}};}}
function compile(label,source){
  retain(label+'-input',{source});
  const actual=outcome(()=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source}));
  retain(label+'-complete',{source,actual});assert.ok(actual.value,JSON.stringify(actual.error));
  return actual.value;
}
function checked(result,label){
  const canonical=JSON.stringify(result.meta.checkedSemanticProgram),program=parseProgram(canonical),roundtrip=serializeProgram(parseProgram(serializeProgram(program)));
  retain(label+'-checked-meta',{canonical,roundtrip});assert.equal(roundtrip,serializeProgram(program));return program;
}
function nodes(value,kind,result=[]){
  if(value instanceof Map){for(const child of value.values())nodes(child,kind,result);return result;}
  if(!value||typeof value!=='object')return result;if(value.k===kind)result.push(value);
  for(const [key,child]of Object.entries(value))if(!['type','span'].includes(key))for(const item of Array.isArray(child)?child:[child])nodes(item,kind,result);return result;
}
const immutable=values=>Object.freeze(values.map(value=>BigInt(value)));

test('an explicit callback return targets bool even inside an integer or Option source function',{timeout:60000},async()=>{
  const source='pub fn outer()->u64{let found=(0u8..4u8).any(|value|{if value==2u8{return true;}false});if found{7u64}else{9u64}} pub fn option_outer()->Option<u8>{let found=(0u8..4u8).all(|value|{if value==2u8{return false;}true});if found{Some(7u8)}else{None}}';
  const result=compile('01',source),program=checked(result,'01');assert.deepEqual(result.meta.refused,[]);
  const callbacks=nodes(program.declarations,'routerLambda');retain('01-callbacks',{callbacks});assert.equal(callbacks.length,2);for(const callback of callbacks){assert.equal(callback.type.result.kind,'bool');assert.ok(nodes(callback,'routerReturn').length);}
  const observations=[];await verifyTypedTargets(result,api=>{const row={outer:api.outer(),option:api.option_outer()};observations.push(row);retain('01-targets',{observations});assert.equal(row.outer,7n);assert.deepEqual(row.option,{$:'None'});},{childTimeoutMs:20000});
});

test('actual lazy iterator panic order and empty any all results stay independent of callback exits',{timeout:60000},async()=>{
  const source='pub fn selected(values:&[u8])->bool{values.iter().copied().map(|value|255u8/value).any(|value|{if value==255u8{return true;}false})} pub fn all_small(values:&[u8])->bool{values.iter().copied().all(|value|{if value>2u8{return false;}true})}';
  const result=compile('02',source);checked(result,'02');assert.deepEqual(result.meta.refused,[]);const observations=[];
  await verifyTypedTargets(result,api=>{
    const rows=[{kind:'selected',input:immutable([1,0]),actual:outcome(()=>api.selected(immutable([1,0])))},{kind:'selected-empty',actual:outcome(()=>api.selected(immutable([])))},{kind:'panic-after-false',actual:outcome(()=>api.selected(immutable([2,0])))},{kind:'all',actual:outcome(()=>api.all_small(immutable([1,3,0])))},{kind:'all-empty',actual:outcome(()=>api.all_small(immutable([])))}];
    observations.push(rows);retain('02-targets',{observations});assert.equal(rows[0].actual.value,true);assert.equal(rows[1].actual.value,false);assert.ok(rows[2].actual.error);assert.equal(rows[3].actual.value,false);assert.equal(rows[4].actual.value,true);
  },{childTimeoutMs:20000});
});

test('fold callback return resumes the next invocation instead of returning the source function',{timeout:60000},async()=>{
  const source='pub fn fold(values:&[u64])->u64{let total=values.iter().copied().fold(0u64,|sum,value|{if value==0u64{return sum;}sum+value});total+100u64} pub fn nested()->u64{let found=(0u8..2u8).any(|left|{let inner=(0u8..2u8).any(|right|{if right==left{return true;}false});if inner{return true;}false});if found{11u64}else{13u64}}';
  const result=compile('03',source);checked(result,'03');assert.deepEqual(result.meta.refused,[]);const observations=[];
  await verifyTypedTargets(result,api=>{
    const inputs=[[],[1,0,2],[0,3,0,4]],rows=inputs.map(input=>({input,actual:api.fold(immutable(input)),expected:BigInt(input.reduce((sum,value)=>sum+value,100))}));const nested=api.nested();observations.push({rows,nested});retain('03-targets',{observations});for(const row of rows)assert.equal(row.actual,row.expected);assert.equal(nested,11n);
  },{childTimeoutMs:20000});
});

test('local shadows and read-only scalar captures preserve outer values without captured mutation permission',{timeout:60000},async()=>{
  const source='pub fn shadow()->bool{let mut value=7u8;(0u8..2u8).any(|value|{if value==1u8{return true;}false})} pub fn local()->bool{(0u8..2u8).any(|value|{let mut copy=value;copy+=1u8;if copy==2u8{return true;}false})} pub fn local_shadow()->u8{let mut copy=7u8;let found=(0u8..2u8).any(|value|{let mut copy=value;copy+=1u8;if copy==2u8{return true;}false});if found{copy}else{0u8}} pub fn read_only()->u8{let mut copy=7u8;let found=(0u8..2u8).any(|value|{if value<copy{return true;}false});if found{copy}else{0u8}}';
  const result=compile('04',source);checked(result,'04');assert.deepEqual(result.meta.refused,[]);const observations=[];
  await verifyTypedTargets(result,api=>{const row={shadow:api.shadow(),local:api.local(),localShadow:api.local_shadow(),readOnly:api.read_only()};observations.push(row);retain('04-targets',{observations});assert.deepEqual(row,{shadow:true,local:true,localShadow:7n,readOnly:7n});},{childTimeoutMs:20000});
  const bad='pub fn bad()->bool{let mut captured=0u8;(0u8..2u8).any(|value|{captured=value;return true;false})}',refusal=compile('04-captured',bad);retain('04-capture-refusal',{bad,refusal});assert.ok(refusal.meta.refused.some(row=>row.name==='bad'));
  const nestedBad='pub fn nested_bad()->bool{let mut captured=0u8;(0u8..2u8).any(|value|{let inner=(0u8..2u8).any(|right|{return right==value;false});captured=value;inner})}',nestedRefusal=compile('04-nested-captured',nestedBad);retain('04-nested-capture-refusal',{nestedBad,nestedRefusal});assert.ok(nestedRefusal.meta.refused.some(row=>row.name==='nested_bad'));
});

test('fresh source and edited CST reject wrong return results hidden unreachable work and other boundaries',{timeout:60000},()=>{
  const sources=[
    'pub fn bad()->bool{(0u8..2u8).any(|value|{return value;false})}',
    'pub fn bad()->bool{(0u8..2u8).any(|value|{return true;unfamiliar!();false})}',
    'pub fn bad()->bool{(0u8..2u8).any(|value|{break;false})}',
    'pub fn bad()->bool{(0u8..2u8).any(|value|{continue;false})}',
    'pub fn bad()->bool{(0u8..2u8).any(|value|{let ignored=future.await;return true;false})}',
    'pub fn bad()->bool{(0u8..2u8).any(|(value,)|{return true;false})}',
    "pub fn bad()->u8{let value={return 1u8;0u8};value}",
    "pub fn bad()->u8{1u8+{return 2u8;0u8}}",
  ];
  const rows=[];for(const source of sources){const document=createConcreteSyntaxMeta(source,{language:'Rust'}),meta=serializeConcreteSyntaxMeta(document),plain=outcome(()=>translateSource(source)),cst=outcome(()=>translateSourceConcreteSyntaxMeta(meta));rows.push({source,document,meta,plain,cst});retain('05-refusal',rows.at(-1));for(const result of [plain,cst]){assert.ok(result.value);assert.equal(result.value.ir.items.find(row=>row.name==='bad').status,'carried');assert.equal(result.value.ir.items.map(row=>row.source).join(''),source);}assert.deepEqual(cst.value.ir,plain.value.ir);}
  retain('05-all',{rows,checkedMetaLimitation:'Canonical checked meta shape is not an untrusted whole type-proof verifier. Fresh source/CST must pass the actual checker; no new callback authority flag or verdict cache is introduced.'});
});

test('Option callback propagation stays explicitly refused while existing outer function propagation is unchanged',{timeout:60000},async()=>{
  const source='pub fn outer(value:Option<u8>)->Option<u8>{let found=value?;Some(found)} pub fn pending()->Option<u8>{(0u8..2u8).find_map(|value|{let candidate:Option<u8>=Some(value);let found=candidate?;if found>0u8{return Some(found);}None})}';
  const result=compile('06',source);checked(result,'06');retain('06-owner-boundary',{source,result,pending:'No genuine private original Try::branch/FromResidual owner token exists yet; source availability/layout flags are insufficient. No callback CPS or sentinel claim.'});
  const row=result.meta.refused.find(row=>row.name==='pending');assert.ok(row);assert.match(row.message,/callback Option propagation/u);assert.equal(result.meta.refused.some(row=>row.name==='outer'),false);const observations=[];
  await verifyTypedTargets(result,api=>{const rows=[api.outer(Object.freeze({$:'None'})),api.outer(Object.freeze({$:'Some',field0:3n}))];observations.push(rows);retain('06-targets',{observations});assert.deepEqual(rows,[{$:'None'},{$:'Some',field0:3n}]);},{childTimeoutMs:20000});
});

test('ordinary tail callbacks retain checked output alongside new return callbacks without shared verdict state',{timeout:60000},async()=>{
  const source='pub fn tail(values:&[u8])->bool{values.iter().copied().any(|value|value==2u8)} pub fn controlled(values:&[u8])->bool{values.iter().copied().any(|value|{if value==2u8{return true;}false})}';
  const first=compile('07-first',source),second=compile('07-second',source);checked(first,'07');assert.deepEqual(first.meta.refused,[]);assert.deepEqual(second.meta.refused,[]);retain('07-complete-repeat',{first,second});assert.equal(second.javascript,first.javascript);assert.equal(second.typescript,first.typescript);const observations=[];
  await verifyTypedTargets(first,api=>{const rows=[[],[0,1],[2],[0,2,3]].map(input=>({input,tail:api.tail(immutable(input)),controlled:api.controlled(immutable(input)),expected:input.includes(2)}));observations.push(rows);retain('07-targets',{observations});for(const row of rows){assert.equal(row.tail,row.expected);assert.equal(row.controlled,row.expected);}},{childTimeoutMs:20000});
});

test('complete original repository goals retain every source unit and honest unresolved prerequisites',{timeout:60000},()=>{
  const inputs=[['capabilities.rs','unsupported_server_tool_type'],['resource_capture.rs','sse_id'],['subscription_usage_normalize.rs','anthropic_windows'],['subscription_usage_normalize.rs','duplicate_anthropic_legacy'],['deploy/step.rs','skips']],rows=[];
  for(const [file,name]of inputs){const source=readFileSync(new URL('../../../src/'+file,import.meta.url),'utf8'),actual=outcome(()=>translateSource(source,'src/'+file));rows.push({file,name,source,sha256:createHash('sha256').update(source).digest('hex'),actual});retain('08-production-source',rows.at(-1));assert.ok(actual.value);assert.equal(actual.value.ir.items.map(row=>row.source).join(''),source);assert.ok(actual.value.ir.items.some(row=>row.source.includes('fn '+name+'(')));}
  retain('08-complete',{rows,limits:'Full source observations only. First-refusal removal does not prove these functions executable: parser profile, captured owners, normalize_label chars, owned filter_map payloads and borrowed tuple results retain separate obligations. Rust oracle is CI-only and UNRUN by this worker.'});
});
