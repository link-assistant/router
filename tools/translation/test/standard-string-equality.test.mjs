import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const hash=source=>createHash('sha256').update(source).digest('hex');
const find=(value,predicate)=>value&&typeof value==='object'?(predicate(value)?value:Object.entries(value).filter(([key])=>!['type','copyCertificate'].includes(key)).map(([,child])=>Array.isArray(child)?child.map(item=>find(item,predicate)).find(Boolean):find(child,predicate)).find(Boolean)):null;

test('unchanged production RefUpdate create/delete bodies consume standard String-place equality',async()=>{
  const source=readFileSync(new URL('../../../src/git_proxy.rs',import.meta.url),'utf8');
  assert.equal(hash(source),'ed47b0f287dcf7cc1d03672ed1abd924bebb5862929af06f714ccdff42409f22');
  const pins=[['const','ZERO_OID',1299,1365,'53cd2719fed634701423b50bb15c35d990c10ff0c22a4cb8c6edd726d78bc961'],['struct','RefUpdate',1426,1553,'2768451b4d5c3269ba735025323a70750cd62bad5d38ab5c012de64916ae4875'],['impl','RefUpdate',1555,1859,'b2acf1c1a0586cd8458cfafb5ece73065ed27cfd151bfc8c45786ada41c6e442']];
  const declarations=pins.map(([term,name,start,end,digest])=>{assert.ok(sourceItems(source).some(item=>item.term===term&&item.name===name&&item.start===start&&item.end===end));const text=source.slice(start,end);assert.equal(hash(text),digest);return text;});
  const methods=extractImplDeclarations(source).implementations.find(item=>item.typePath.join('::')==='RefUpdate')?.methods;
  for(const [name,start,end,digest]of [['is_delete',1621,1705,'adf0f84709905301f2efae966cf9fceb1f2114b10f03303ac8b29f0043aeb7d7'],['is_create',1773,1857,'5ea266e5e33f97cd685bcc5e71d7d7cbba0b21c6090915e1293a8e382e3a32a1']]){assert.ok(methods?.some(method=>method.name===name&&method.span.start===start&&method.span.end===end));assert.equal(hash(source.slice(start,end)),digest);}
  const result=project(declarations.join('\n'));assert.deepEqual(result.meta.refused,[]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
  const names=[];
  for(const method of ['is_create','is_delete']){
    const entry=[...checked.declarations.values()].find(entry=>entry.impl?.method===method);assert.ok(entry);
    const equality=find(entry.body,node=>node.standardStringEquality);assert.deepEqual(equality.standardStringEquality,{profile:'rust-1.89-standard-string-partial-eq',left:'String',right:'&str'});
    assert.equal(equality.left.sharedProjectionProof.kind,'borrowed-field-place');assert.equal(equality.left.type.rustReference.pointee.rustOwnership.kind,'owned');
    names.push(`${[...target.declarations.values()].find(entry=>entry.impl?.method===method).name} as ${method}`);
  }
  const exports=`\nexport {${names.join(',')}};`;
  await verifyTypedTargets({...result,javascript:result.javascript+exports,typescript:result.typescript+exports},(_api,_result,module)=>{
    const zero='0000000000000000000000000000000000000000',oid='0123456789012345678901234567890123456789';
    for(const [old,newValue,create,remove]of [[zero,oid,true,false],[oid,zero,false,true],[zero,zero,true,true],[oid,oid,false,false],['','',false,false],['零','é',false,false]]){const value=Object.freeze({$:'RefUpdate',old,new:newValue,name:'refs/heads/main'});assert.equal(module.is_create(value),create);assert.equal(module.is_delete(value),remove);}
    assert.throws(()=>module.is_delete({$:'RefUpdate',old:zero,new:4,name:'main'}),TypeError);
  });
});

test('registered String str and shared String equality retains exact scalar outcomes in both targets',async()=>{
  const source='pub fn owned(a:String,b:String)->bool{a==b} pub fn mixed(a:String,b:&str)->bool{a!=b} pub fn reverse(a:&str,b:String)->bool{a==b} pub fn refs(a:&String,b:&String)->bool{a==b} pub fn ref_str(a:&String,b:&str)->bool{a==b} pub fn str_ref(a:&str,b:&String)->bool{a!=b} pub fn strs(a:&str,b:&str)->bool{a==b} pub fn left()->String{String::from("x")} pub fn right()->String{String::from("x")} pub fn pair()->bool{left()==right()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),name=entry=>target.declarations.get(`rp_${Buffer.from(entry).toString('hex')}`).name;
  // Test-only emitted-module instrumentation calls the original checked
  // function bodies inside each wrapper. The Rust source is unchanged.
  const probe=`\nexport function fixtureEqualityOrder(){const events=['start'];events.shift();const l=${name('left')},r=${name('right')};${name('left')}=()=>{events.push('left');return l();};${name('right')}=()=>{events.push('right');return r();};try{return {result:${name('pair')}(),order:events.join(',')};}finally{${name('left')}=l;${name('right')}=r;}}`;
  await verifyTypedTargets({...result,javascript:result.javascript+probe,typescript:result.typescript+probe},(api,_result,module)=>{
    for(const name of ['owned','reverse','refs','ref_str','strs']){assert.equal(api[name]('é','é'),true);assert.equal(api[name]('é','é'),false);assert.equal(api[name]('🦀','🦀'),true);assert.throws(()=>api[name]('x',3),TypeError);}
    assert.equal(api.mixed('x','x'),false);assert.equal(api.mixed('x','y'),true);assert.equal(api.str_ref('x','x'),false);assert.equal(api.str_ref('x','y'),true);
    assert.deepEqual(module.fixtureEqualityOrder(),{result:true,order:'left,right'});
  });
});

test('custom equality reference depth and moves from shared String remain carried',()=>{
  for(const source of ['pub fn bad(a:String,b:&String)->bool{a==b}','pub fn bad(a:&String,b:String)->bool{a==b}','pub fn bad(a:&&String,b:&str)->bool{a==b}','struct S{value:String} pub fn bad(a:S,b:S)->bool{a==b}','struct String{value:u8} pub fn bad(a:String,b:&str)->bool{a==b}','struct S{value:String} impl S{fn take(&self)->String{self.value}} pub fn bad(v:S)->String{v.take()}']){const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.ok(result.meta.refused.length,source);}
});
