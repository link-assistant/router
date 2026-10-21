import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {cargoLayoutFeatureProfileMatches,adaptHistoricalCargoFeatureConsumer} from '../cargo-layout-feature-profile-compatibility.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const base=new URL('../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex'),history=JSON.parse(gunzipSync(readFileSync(new URL('source-profiles/cargo-layout-before/inputs.json.gz',base))));
const paths=['json-macro/features/manifest.json','json-capabilities/manifest.json'];
test('both complete original/current feature profiles retain exactly the reviewed Cargo byte equation',()=>{
 for(const path of paths){const old=Buffer.from(history.profiles['tools/translation/source-profiles/'+path],'base64'),current=readFileSync(new URL('source-profiles/'+path,base)),expected=hash(old);assert.notEqual(hash(current),expected);
  assert.equal(cargoLayoutFeatureProfileMatches(old,expected,path),true);assert.equal(cargoLayoutFeatureProfileMatches(current,expected,path),true);
  const changed=Buffer.concat([current,Buffer.from('\n')]);assert.equal(cargoLayoutFeatureProfileMatches(changed,expected,path),false);
  const profile=JSON.parse(current);profile.packages[0].name+='changed';assert.equal(cargoLayoutFeatureProfileMatches(Buffer.from(JSON.stringify(profile)),expected,path),false);
  assert.equal(cargoLayoutFeatureProfileMatches(current,'0'.repeat(64),path),false);assert.equal(cargoLayoutFeatureProfileMatches(current,expected,path+' '),false);
 }
 let reads=0;const proxy=new Proxy(Buffer.alloc(1),{get(){reads++;throw Error('opaque');}});assert.equal(cargoLayoutFeatureProfileMatches(proxy,'0'.repeat(64),paths[0]),false);assert.equal(reads,0);
});
test('complete pinned original consumers keep every function body and frozen checksum literal in their receiving copies',()=>{
 const directory=new URL('./fixtures/cargo-feature-worklist/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',directory),'utf8')),ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
 for(const row of manifest.sources){const source=readFileSync(new URL(row.storedPath,directory),'utf8');assert.equal(hash(source),row.sha256);const file=row.path.split('/').at(-1),plan=adaptHistoricalCargoFeatureConsumer(source,file);
  assert.equal(plan.compilerAuthority,false);assert.equal(plan.sourceDataOnly,true);assert.equal(plan.inverse,source);assert.equal(transportConcreteSyntaxMeta(plan.beforeMeta).source,source);assert.equal(transportConcreteSyntaxMeta(plan.afterMeta).source,plan.text);assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);
  const functions=text=>{const parsed=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(parsed.parseDiagnostics.length,0);return parsed.statements.filter(node=>ts.isFunctionDeclaration(node)).map(node=>({name:node.name.text,body:node.body.getText(parsed)}));};assert.deepEqual(functions(plan.text),functions(source));assert.ok(functions(source).length>0);
  const literal=/hash\(bytes\)!==('[a-f0-9]{64}')/u.exec(source)[1];assert.ok(plan.text.includes('hash(bytes)!=='+literal));assert.equal(readFileSync(new URL(row.storedPath,directory),'utf8'),source);
  for(const [input,name]of [[source+'\n',file],[source,file+' '],[plan.text,file]])assert.throws(()=>adaptHistoricalCargoFeatureConsumer(input,name),/complete pinned original/u);
 }
});
