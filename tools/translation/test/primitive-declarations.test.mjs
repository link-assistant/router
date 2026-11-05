// Independent ABI/source-reader regression SOURCE. Every new case is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {hostRuntimeAssets,hostRuntimeAssetsNamedDataAliases} from '../host-assets.mjs';
import {primitiveOperatorDeclarationSource,primitiveOperatorRuntimeAssetPair} from '../primitive-operator-runtime-sources.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {preparePrimitiveDeclarationSources} from '../prepare-primitive-declaration-sources.mjs';
const limits={timeout:60000};
test('both actual forward asset factories and the reverse source pair retain one complete physical declaration',limits,()=>{
 const expected=readFileSync(new URL('../extensions/primitive-operator-runtime.d.mts',import.meta.url),'utf8');assert.equal(primitiveOperatorDeclarationSource(),expected);assert.equal(primitiveOperatorRuntimeAssetPair().get('primitive-operator-runtime.d.mts'),expected);for(const assets of [hostRuntimeAssets(),hostRuntimeAssetsNamedDataAliases()])assert.equal(assets.get('primitive-operator-runtime.d.mts'),expected);assert.ok(expected.includes('primitiveBitwise(left:boolean,right:boolean,operation:string,bits:null,signed:null):boolean'));assert.ok(expected.includes('primitiveBitwise(left:bigint,right:bigint,operation:string,bits:number,signed:boolean):bigint'));
});
test('a complete unchanged receiving reader keeps fresh exact UTF8 reads and refuses size encoding and symlink violations',limits,async t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-primitive-declaration-reader-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));mkdirSync(join(directory,'extensions'));const source=readFileSync(new URL('../primitive-operator-runtime-sources.mjs',import.meta.url),'utf8'),concrete=transportConcreteSyntaxSource(source,{language:'JavaScript'});assert.equal(transportConcreteSyntaxMeta(concrete.meta).source,source);writeFileSync(join(directory,'reader.mjs'),source);const declaration=join(directory,'extensions/primitive-operator-runtime.d.mts');writeFileSync(declaration,'\ufeff// first\r\n');const api=await import(pathToFileURL(join(directory,'reader.mjs')).href);assert.equal(api.primitiveOperatorDeclarationSource(),'\ufeff// first\r\n');writeFileSync(declaration,'// changed\n');assert.equal(api.primitiveOperatorDeclarationSource(),'// changed\n');writeFileSync(declaration,Buffer.alloc(262145,32));assert.throws(()=>api.primitiveOperatorDeclarationSource(),/Bounded complete/u);writeFileSync(declaration,Buffer.from([255]));assert.throws(()=>api.primitiveOperatorDeclarationSource(),/Exact primitive operator UTF8/u);rmSync(declaration);writeFileSync(join(directory,'extensions/target.d.mts'),'// target\n');symlinkSync('target.d.mts',declaration);assert.throws(()=>api.primitiveOperatorDeclarationSource(),error=>error.code==='ELOOP');
});
test('three whole source equations retain original declarations owners stages and complete inverses',limits,()=>{
 const plan=preparePrimitiveDeclarationSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
