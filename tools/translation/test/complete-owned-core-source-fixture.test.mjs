import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {completeCoreSourceFixture,completeOwnedCoreSourceFixture} from './complete-core-source-fixture.mjs';
import {deriveCompleteCoreSourceFixtures,CORE_SOURCE_FIXTURE_CONSUMERS} from '../prepare-complete-core-source-fixtures.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url),facadePath='src/translation_core.rs',parents=[
 ['src/translation_core/primitives.rs',ROUTER_CORE_PRIMITIVES_SOURCE],['src/translation_core/json_collections.rs',ROUTER_CORE_JSON_COLLECTIONS_SOURCE],['src/translation_core/ranges.rs',ROUTER_CORE_RANGES_SOURCE],['src/translation_core/base64.rs',ROUTER_CORE_BASE64_SOURCE],
],hash=value=>createHash('sha256').update(value).digest('hex');
test('all actual complete facade children cross CST without changing the authored input',()=>{
 const input={'src/lib.rs':'pub mod translation_core;',[facadePath]:ROUTER_FORMATTING_FACADE_SOURCE},before=Object.getOwnPropertyDescriptors(input),output=completeOwnedCoreSourceFixture(input);
 assert.deepEqual(Object.getOwnPropertyDescriptors(input),before);assert.deepEqual(Object.keys(output),[...Object.keys(input),...parents.map(([path])=>path)]);
 for(const [path,source]of parents){assert.equal(readFileSync(repositorySourceURL('rust/'+path,root),'utf8'),source);assert.equal(output[path],source);const stage=transportConcreteSyntaxSource(source,{language:'Rust'});assert.equal(transportConcreteSyntaxMeta(stage.meta).source,source);}
 assert.strictEqual(completeOwnedCoreSourceFixture(output),output);assert.equal(Object.hasOwn(output,'namespaceAuthority'),false);
 const old=completeCoreSourceFixture(input);assert.deepEqual(Object.keys(old),[...Object.keys(input),'src/translation_core/json_collections.rs']);
});
test('explicit wrong, undefined and accessor child fields remain untouched without callbacks',()=>{
 let reads=0;
 for(const [path]of parents)for(const value of [undefined,'// intentionally different source']){const input={[facadePath]:ROUTER_FORMATTING_FACADE_SOURCE,[path]:value},output=completeOwnedCoreSourceFixture(input);assert.deepEqual(Object.getOwnPropertyDescriptor(output,path),Object.getOwnPropertyDescriptor(input,path));}
 const input={[facadePath]:ROUTER_FORMATTING_FACADE_SOURCE};for(const [path]of parents)Object.defineProperty(input,path,{enumerable:true,get(){reads++;throw Error('must stay opaque');}});Object.defineProperty(input,'src/other.rs',{enumerable:true,get(){reads++;throw Error('must stay opaque');}});
 assert.strictEqual(completeOwnedCoreSourceFixture(input),input);assert.equal(reads,0);
 for(const candidate of [{[facadePath]:ROUTER_FORMATTING_FACADE_SOURCE+' '},{'src/lib.rs':'pub fn value(){}'},Object.defineProperty({},facadePath,{enumerable:true,get(){reads++;throw Error('must stay opaque');}})])assert.strictEqual(completeOwnedCoreSourceFixture(candidate),candidate);assert.equal(reads,0);
});
test('actual producer retains the old helper and reproduces all four complete installed source files',()=>{
 const paths=['tools/translation/test/complete-core-source-fixture.mjs',...CORE_SOURCE_FIXTURE_CONSUMERS],sources=new Map(paths.map(path=>[path,readFileSync(repositorySourceURL(path,root),'utf8')])),plan=deriveCompleteCoreSourceFixtures({sources});assert.equal(plan.files.length,4);assert.equal(plan.qualified,false);assert.equal(plan.sourceAndOwnerVerdictsCached,false);
 for(const row of plan.files){assert.equal(row.text,sources.get(row.path));assert.equal(hash(row.text),row.sha256);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.source);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.text);assert.equal(row.inverse,row.source);}
 assert.deepEqual(plan.facade.children,parents.map(([path])=>path.split('/').at(-1).slice(0,-3)));assert.equal(plan.facade.source,ROUTER_FORMATTING_FACADE_SOURCE);assert.equal(transportConcreteSyntaxMeta(plan.facade.meta).source,plan.facade.source);
 const helper=plan.files[0];assert.equal(transportConcreteSyntaxMeta(helper.copiedFunction.meta).source,helper.copiedFunction.source);assert.ok(helper.text.includes(helper.copiedFunction.source));assert.ok(helper.source.includes(helper.copiedFunction.source));
});
test('source proposals refuse incomplete inputs and altered original helper or consumer syntax',()=>{
 const paths=['tools/translation/test/complete-core-source-fixture.mjs',...CORE_SOURCE_FIXTURE_CONSUMERS],sources=new Map(paths.map(path=>[path,readFileSync(repositorySourceURL(path,root),'utf8')]));assert.throws(()=>deriveCompleteCoreSourceFixtures({sources:new Map()}));
 for(const path of paths){const changed=new Map(sources);changed.set(path,changed.get(path)+'\nconst broken = ;');assert.throws(()=>deriveCompleteCoreSourceFixtures({sources:changed}));}
 const changed=new Map(sources);changed.set(paths[0],changed.get(paths[0]).replace('export function completeCoreSourceFixture(input){','export function renamed(input){'));assert.throws(()=>deriveCompleteCoreSourceFixtures({sources:changed}));
});
