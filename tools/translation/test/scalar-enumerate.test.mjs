import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {SCALAR_ENUMERATE_PROFILE,requireScalarEnumerate} from '../extensions/scalar-enumerate.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
function find(node,predicate){
  if(!node||typeof node!=='object')return null;
  if(predicate(node))return node;
  for(const [key,value] of Object.entries(node))if(!['type','span','sourceIteratorEnumerate'].includes(key)){
    for(const child of Array.isArray(value)?value:[value]){const result=find(child,predicate);if(result)return result;}
  }
  return null;
}

test('enumerate keeps actual usize and original scalar Item identities in checked meta and both typed targets',async()=>{
  const source='pub fn indexed()->usize{let mut total:usize=0;for (index,value) in (1u8..4u8).enumerate(){total+=index+usize::from(value);}total} pub fn empty()->usize{let mut total:usize=0;for (index,_) in (0u8..0u8).enumerate(){total+=index;}total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  const operation=find(checked.declarations.get('indexed').body,node=>node.k==='routerIteratorOperation'&&node.op==='enumerate');
  assert.equal(operation.sourceIteratorEnumerate.profile,SCALAR_ENUMERATE_PROFILE.id);
  assert.equal(operation.sourceIteratorEnumerate.indexType.rustPrimitiveName,'usize');
  assert.equal(operation.sourceIteratorEnumerate.itemType.rustPrimitiveName,'u8');
  const tuple=checked.declarations.get(operation.type.element.name);
  assert.equal(tuple.ctors[0].fields[0].type.rustPrimitiveName,'usize');
  assert.equal(tuple.ctors[0].fields[1].type.rustPrimitiveName,'u8');
  await verifyTypedTargets(result,api=>{assert.equal(api.indexed(),9n);assert.equal(api.empty(),0n);});
});

test('enumerate uses original source callback order, lazy overflow and forward loop control',async()=>{
  const source='pub fn early()->usize{let mut total:usize=0;for (index,value) in (0u8..=255u8).map(|n|n+1u8).enumerate(){if index==2usize{break;}if index==0usize{continue;}total+=usize::from(value);}total} pub fn downstream()->usize{let mut total:usize=0;for (index,value) in (1u8..=255u8).enumerate().map(|(index,n)|(index,n+1u8)).take(2usize){total+=index+usize::from(value);}total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.early(),2n);assert.equal(api.downstream(),6n);});
});

test('enumerate reuses bounded inferred anonymous products and copied source primitive items',async()=>{
  const source='pub fn products()->usize{let mut total:usize=0;for (index,(value,flag)) in (1u8..4u8).map(|n|(n,true)).enumerate(){if flag{total+=index+usize::from(value);}}total} pub fn copied(values:&[u8])->usize{let mut total:usize=0;for (index,value) in values.iter().copied().enumerate(){total+=index+usize::from(value);}total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.products(),9n);assert.equal(api.copied(Object.freeze([1n,2n,3n])),9n);assert.equal(api.copied(Object.freeze([])),0n);});
});

test('borrowed, nominal, equal-width and specialized consumption obligations remain original carried source',()=>{
  for(const source of [
    'pub fn bad(values:&[u8])->usize{let mut total:usize=0;for (index,value) in values.iter().enumerate(){total+=index;}total}',
    'struct Boxed(u8);pub fn bad()->usize{let mut total:usize=0;for (index,_) in (0u8..2u8).map(|n|Boxed(n)).enumerate(){total+=index;}total}',
    'pub fn bad()->u64{let mut total:u64=0;for (index,_) in (0u8..2u8).enumerate(){total+=index;}total}',
    'pub fn bad()->usize{(0u8..2u8).enumerate().count()}',
    'pub fn bad()->usize{(0u8..2u8).enumerate().map(|(index,_)|index).sum()}',
    'pub fn bad()->usize{(0u8..2u8).enumerate().take(1usize).fold(0usize,|sum,(index,_)|sum+index)}',
  ]){
    const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');
    assert.equal(item.status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});

test('full original source pins and evaluation receipts survive meta round trips without granting broader authority',()=>{
  const root=new URL('../source-profiles/scalar-enumerate/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
  for(const input of manifest.sources){const raw=gunzipSync(readFileSync(new URL(input.file,root)));assert.equal(raw.length,input.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),input.sha256);}
  const result=project('pub fn value()->usize{let mut total:usize=0;for (index,_) in (0u8..2u8).enumerate(){total+=index;}total}');
  assert.deepEqual(result.meta.refused,[]);
  const operation=find(parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('value').body,node=>node.k==='routerIteratorOperation'&&node.op==='enumerate');
  assert.deepEqual(operation.sourceIteratorEnumerate.evaluationOrder,['upstream-next','copy-original-count','checked-usize-increment','yield-original-index-and-item']);
  assert.equal(operation.sourceIteratorEnumerate.namespaceComplete,false);assert.equal(operation.sourceIteratorEnumerate.advancedMethodsComplete,false);
  requireScalarEnumerate(operation,rustFixedType('usize'));
  const forged=structuredClone(operation);forged.sourceIteratorEnumerate.evaluationOrder.reverse();
  assert.throws(()=>requireScalarEnumerate(forged,rustFixedType('usize')),/missing actual checked/u);
});
