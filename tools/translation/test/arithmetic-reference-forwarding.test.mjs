import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {freezeMacroTree} from '../macro-token-trees.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {compilePinnedJsonSliceReferenceFragments,pinnedJsonSliceReferencePrograms} from '../json-roundtrip-reference-fragments.mjs';
import {isArithmeticReferenceSource} from '../arithmetic-reference-source.mjs';
import {compileArithmeticSourceFragments,bindArithmeticSourceData,bindArithmeticReferenceSource,extendArithmeticSourceData,projectArithmeticSource} from '../arithmetic-source-fragments.mjs';
import {compileArithmeticSourceData} from '../arithmetic-source-data.mjs';
const root=new URL('../../../',import.meta.url),dependencies=()=>loadJsonMacroSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')}),path='impl::AsRef::shared_T::as_ref';
function compiled(){const candidate=compilePinnedJsonSliceReferenceFragments(dependencies(),{sharedForwarding:true}),state=pinnedJsonSliceReferencePrograms(candidate),program=bindArithmeticReferenceSource(bindArithmeticSourceData(state.program,state.modulePath,[state.data]),state.referenceSource);return {candidate,state,program};}
test('original full core shared-reference header, where predicate and UFCS keep source identity and both receiver levels',()=>{
  const {candidate,state}=compiled(),original=gunzipSync(readFileSync(new URL('../source-profiles/json-macro/standard/library-core-src-convert-mod.rs.gz',import.meta.url))).toString('utf8'),fn=state.program.functions.find(fn=>fn.name===path),predicate=fn.context.wherePredicates[0];
  assert.equal(candidate.source.sha256,'0b05be0bc9c7d92d788abd6817d648b4479ed6e29ffe24cfd6879e09ee9fbdab');assert.equal(createHash('sha256').update(original.slice(fn.span.start,fn.span.end)).digest('hex'),fn.sha256);assert.equal(original.slice(fn.params[0].receiverSource.span.start,fn.params[0].receiverSource.span.end),'&self');assert.equal(fn.params[0].type.kind,'ref');assert.equal(fn.params[0].type.inner.kind,'ref');assert.equal(fn.params[0].type.inner.inner.source,'T');assert.deepEqual(fn.generics.map(row=>[row.name,row.bound]),[['T','PointeeSized'],['U','PointeeSized']]);assert.deepEqual([predicate.subject,predicate.trait,predicate.argument],['T','AsRef','U']);assert.equal(fn.ir.tail.callee.kind,'ufcs');assert.equal(original.slice(fn.ir.tail.callee.sourceSpan.start,fn.ir.tail.callee.sourceSpan.end),'<T as AsRef<U>>::as_ref');assert.equal(fn.ir.tail.args[0].kind,'deref');
  assert.equal(isArithmeticReferenceSource(state.referenceSource),true);assert.equal(state.referenceSource.traits[0].name,'AsRef');assert.equal(state.referenceSource.canonicalDeclarationIdentified,true);for(const key of ['attributeOwnerVerified','callerTraitOwnerVerified','copyContractVerified','namespaceAuthority','parseAdmission','applicationEffectCompleteness','runtimeParity'])assert.equal(state.referenceSource[key],false,key);
});
test('actual shared forwarding executes the unchanged UFCS and slice bodies in both bounded word projections',()=>{
  const {program}=compiled();for(const bits of [32,64])for(const input of [[],[0n],[1n,(1n<<BigInt(bits))-1n]]){const result=projectArithmeticSource(program,path,[{shared:input}],{limbBits:bits});assert.deepEqual(result.value,input);assert.deepEqual(result.mutations,[input]);assert.equal(result.calls.some(row=>row.path==='impl::AsRef::slice_T::as_ref'),true);assert.equal(result.referenceSourceBindingProjected,true);assert.equal(result.parseAdmission,false);assert.equal(result.sourceBehaviorFidelityVerified,false);}
});
test('nongenuine predicates, custom same-named traits and mutable forwarding cannot resolve canonical source membership',()=>{
  const {state}=compiled(),base='impl<T: PointeeSized,U: PointeeSized> AsRef<U> for &T where T:AsRef<U>, {fn as_ref(&self)->&U{<T as AsRef<U>>::as_ref(*self)}}';
  for(const source of [base.replace('where T:AsRef<U>','where U:AsRef<T>'),base.replace('for &T','for &mut T')])assert.throws(()=>compileArithmeticSourceFragments(source,[path]),/Actual arithmetic function absent/);
  assert.throws(()=>compileArithmeticSourceFragments(base.replace('<T as AsRef<U>>::as_ref','<U as AsRef<T>>::as_ref'),[path]),/UFCS does not match/);
  const custom=compileArithmeticSourceFragments('trait AsRef<U>{} '+base,[path]),module=['custom'],data=compileArithmeticSourceData('trait AsRef<U>{} '+base,module),bound=bindArithmeticReferenceSource(bindArithmeticSourceData(custom,module,[data,state.data]),state.referenceSource);assert.throws(()=>projectArithmeticSource(bound,path,[{shared:[1n]}]),/canonical reference source membership differs/);
  const noWhere='impl<T> AsRef<[T]> for [T]{fn as_ref(&self)->&[T]{<T as AsRef<T>>::as_ref(self)}}';assert.throws(()=>compileArithmeticSourceFragments(noWhere,['impl::AsRef::slice_T::as_ref']),error=>error instanceof TypeError&&error.message==='Unproved arithmetic expression token <');
});
test('private source signatures, exact reference depth and descriptor guards survive context extension without new proof authority',()=>{
  const {state,program}=compiled();assert.equal(isArithmeticReferenceSource(structuredClone(state.referenceSource)),false);assert.throws(()=>bindArithmeticReferenceSource(bindArithmeticSourceData(state.program,state.modulePath,[state.data]),freezeMacroTree(structuredClone(state.referenceSource))),/private original source/);assert.throws(()=>projectArithmeticSource(structuredClone(program),path,[{shared:[1n]}]),/private source program/);
  const extra=compileArithmeticSourceData('const UNUSED:u32=9;',['other']),extended=extendArithmeticSourceData(program,[extra]);assert.deepEqual(projectArithmeticSource(extended,path,[{shared:[7n]}]).value,[7n]);assert.throws(()=>projectArithmeticSource(program,path,[[1n]]),/plain immutable view/);assert.throws(()=>projectArithmeticSource(program,path,[{shared:[1n],mutable:true}]),/one own shared/);assert.throws(()=>projectArithmeticSource(program,path,[{shared:[1n<<32n]}]),RangeError);
  let reads=0;const getter={};Object.defineProperty(getter,'shared',{enumerable:true,get(){reads++;throw Error('getter');}});assert.throws(()=>projectArithmeticSource(program,path,[getter]),/one own shared/);assert.equal(reads,0);const proxy=new Proxy({shared:[1n]},{get(){reads++;throw Error('proxy');}});assert.throws(()=>projectArithmeticSource(program,path,[proxy]),/plain immutable/);assert.equal(reads,0);
});
