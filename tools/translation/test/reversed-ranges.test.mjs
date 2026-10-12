import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {REVERSED_RANGE_PROFILE,requireReversedRange} from '../extensions/reversed-ranges.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
function find(node,predicate) {
  if(!node||typeof node!=='object')return null;
  if(predicate(node))return node;
  for(const [key,value]of Object.entries(node))if(!['type','span','sourceIteratorReverse'].includes(key))for(const child of Array.isArray(value)?value:[value]){const match=find(child,predicate);if(match)return match;}
  return null;
}

test('fresh inclusive and exclusive fixed ranges preserve actual reversed source Items',async()=>{
  const source='pub fn inclusive()->u16{let mut total:u16=0;for n in (1u8..=3u8).rev(){total=total*10u16+u16::from(n);}total} pub fn exclusive()->u16{let mut total:u16=0;for n in (1u8..3u8).rev(){total=total*10u16+u16::from(n);}total} pub fn single()->u8{let mut total:u8=0;for n in (7u8..=7u8).rev(){total+=n;}total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  for(const [name,kind]of [['inclusive','RangeInclusive'],['exclusive','Range']]) {
    const operation=find(checked.declarations.get(name).body,node=>node.k==='routerIteratorOperation'&&node.op==='rev');
    assert.equal(operation.type.element.rustPrimitiveName,'u8');
    assert.equal(operation.sourceIteratorReverse.profile,REVERSED_RANGE_PROFILE.id);
    assert.equal(operation.sourceIteratorReverse.rangeKind,kind);requireReversedRange(operation);
  }
  await verifyTypedTargets(result,api=>{assert.equal(api.inclusive(),321n);assert.equal(api.exclusive(),21n);assert.equal(api.single(),7n);});
});

test('empty descending and equality-exclusive ranges execute no loop bodies',async()=>{
  const source='pub fn empty()->u8{let mut total:u8=0;for n in (3u8..1u8).rev(){total+=10u8/n;}for n in (3u8..=1u8).rev(){total+=10u8/n;}for n in (0u8..0u8).rev(){total+=10u8/n;}total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>assert.equal(api.empty(),0n));
});

test('signed and maximum unsigned endpoints retain checked source fixed identities',async()=>{
  const source='pub fn signed()->i16{let mut total:i16=0;for n in (-128i8..=-127i8).rev(){total+=i16::from(n);}total} pub fn maximum()->u16{let mut total:u16=0;for n in (254u8..=255u8).rev(){total+=u16::from(n);}total} pub fn wide()->usize{let mut count:usize=0;for _ in (340282366920938463463374607431768211454u128..=340282366920938463463374607431768211455u128).rev(){count+=1usize;}count} pub fn minimum()->i8{let mut total:i8=0;for n in (-128i8..=-128i8).rev(){total=n;}total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.signed(),-255n);assert.equal(api.maximum(),509n);assert.equal(api.wide(),2n);assert.equal(api.minimum(),-128n);});
});

test('reversed source next adapters preserve lazy callbacks enumeration and original loop control',async()=>{
  const source='pub fn lazy()->u8{let mut total:u8=0;for n in (0u8..3u8).rev().map(|n|10u8/n).take(2usize){total+=n;}total} pub fn filtered()->u8{let mut total:u8=0;for n in (0u8..4u8).rev().filter(|n|*n>1u8){total+=n;}total} pub fn indexed()->usize{let mut total:usize=0;for (index,n) in (0u8..3u8).rev().enumerate(){if index==0usize{continue;}if index==2usize{break;}total+=index+usize::from(n);}total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.lazy(),15n);assert.equal(api.filtered(),5n);assert.equal(api.indexed(),2n);});
});

test('original endpoint effects occur once each in source left-to-right order',async()=>{
  const source='fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()} fn lower()->u8{let ignored=mark("start");0} fn upper()->u8{let ignored=mark("end");3} pub fn observed()->u8{let mut total:u8=0;for n in (lower()..upper()).rev(){total+=n;}total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,(api,{withEffectCapabilities})=>{
    const calls=[];const value=withEffectCapabilities({fs:{sync:{readFileSync(path){calls.push(path);return new Uint8Array();}}}},()=>api.observed());
    assert.equal(value,3n);assert.deepEqual(calls,['start','end']);
  });
});

test('reversed ranges retain per-source checked project closure without rewriting original bodies',async()=>{
  const source='fn lower()->u8{1} fn upper()->u8{4} pub fn total()->u16{let mut n:u16=0;for value in (lower()..upper()).rev(){n=n*10u16+u16::from(value);}n}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const file=translateSource(source,'src/lib.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});
  assert.equal(file.ir.items.map(item=>item.source).join(''),source);
  assert.equal(file.ir.counts.executableFunctions,3);
  await verifyTypedTargets(file,api=>assert.equal(api.total(),321n));
});

test('other iterator reversals references and specialized consumers keep their original carried source',()=>{
  for(const source of [
    'pub fn bad(values:&[u8])->u8{let mut total:u8=0;for n in values.iter().rev(){total+=*n;}total}',
    'pub fn bad()->u8{let mut total:u8=0;for n in (0u8..3u8).map(|n|n+1u8).rev(){total+=n;}total}',
    'pub fn bad()->u8{let mut total:u8=0;for n in (0u8..3u8).rev().rev(){total+=n;}total}',
    'pub fn bad()->u8{let mut total:u8=0;for n in (0u8..3u8).rev::<u8>(){total+=n;}total}',
    'pub fn bad()->u8{let mut total:u8=0;for n in (0u8..3u8).rev(1u8){total+=n;}total}',
    'pub fn bad()->usize{(0u8..3u8).rev().count()}',
    'pub fn bad()->u8{(0u8..3u8).rev().sum()}',
    'pub fn bad()->u8{(0u8..3u8).rev().take(2usize).fold(0u8,|total,n|total+n)}',
    'pub fn bad()->Vec<u8>{(0u8..3u8).rev().collect()}',
    'pub fn bad()->u8{let values=(0u8..3u8).rev();let mut total:u8=0;for n in values{total+=n;}total}',
    'pub fn bad(start:&u8,end:&u8)->u8{let mut total:u8=0;for n in (start..end).rev(){total+=n;}total}',
    'pub fn bad()->u64{let mut total:u64=0;for n in (0usize..3usize).rev(){total+=n;}total}',
  ]) {
    const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');
    assert.equal(item.status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});

test('full official source pins and exact checked reverse proofs survive meta without broader authority',()=>{
  const root=new URL('../source-profiles/reversed-ranges/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
  for(const source of manifest.sources){const raw=gunzipSync(readFileSync(new URL(source.file,root)));assert.equal(raw.length,source.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),source.sha256);if(source.gitBlobSha)assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex'),source.gitBlobSha);}
  const result=project('pub fn total()->usize{let mut total:usize=0;for n in (0usize..3usize).rev(){total+=n;}total}');assert.deepEqual(result.meta.refused,[]);
  const node=find(parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('total').body,node=>node.k==='routerIteratorOperation'&&node.op==='rev');
  requireReversedRange(node);assert.equal(node.constEligible,false);assert.equal(node.sourceIteratorReverse.namespaceComplete,false);assert.equal(node.sourceIteratorReverse.advancedMethodsComplete,false);
  for(const mutate of [
    node=>{node.sourceIteratorReverse.namespaceComplete=true;},
    node=>{node.sourceIteratorReverse.advancedMethodsComplete=true;},
    node=>{node.sourceIteratorReverse.itemType.rustPrimitiveName='u64';},
    node=>{node.sourceIteratorReverse.rangeKind='RangeInclusive';},
    node=>{node.sourceIteratorReverse.rangeSourceSpan.start++;},
    node=>{node.sourceIteratorReverse.sourceInputs[0].sha256='0'.repeat(64);},
    node=>{node.sourceIteratorReverse.evaluationOrder.reverse();},
  ]){const altered=structuredClone(node);mutate(altered);assert.throws(()=>requireReversedRange(altered),/missing actual checked/u);}
});
