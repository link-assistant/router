import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
import {deriveRepositoryLayoutReadSources} from '../prepare-repository-layout-readers.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const repository=fileURLToPath(new URL('../../../',import.meta.url)),path='tools/translation/test/actual-readers.test.mjs';
const source=`import fs from 'node:fs';
import {readFileSync as read} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url)),urlRoot=new URL('../../../',import.meta.url);
export function fromUrl(name){return read(new URL('../../../'+name,import.meta.url),'utf8');}
export function fromPath(name){return fs.readFileSync(join(root,name),'utf8');}
export function fromRoot(name){return read(new URL(name,urlRoot),'utf8');}
export function fromLiteral(){return read(new URL('../../../src/lib.rs',import.meta.url),'utf8');}
export const embedded='readFileSync(new URL("../../../src/original.rs",import.meta.url))';
`;
const propose=(source,repositoryRoot='/private/tmp/router-layout-parser-receiver')=>deriveRepositoryLayoutReadSources({sources:new Map([[path,source]]),repositoryRoot});
function replay(row){let text=row.source;for(const edit of [...row.selected].sort((a,b)=>b.start-a.start||b.end-a.end)){assert.equal(text.slice(edit.start,edit.end),edit.before);text=text.slice(0,edit.start)+edit.after+text.slice(edit.end);}assert.equal(text,row.text);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.source);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.text);assert.equal(row.inverse,row.source);assert.deepEqual(row.trace.map(entry=>entry.phase),['language','repository']);}

test('native lexical roots and actual filesystem imports drive complete replayable CST path proposals',{timeout:30000},()=>{
 const proposal=propose(source);assert.equal(proposal.files.length,1);assert.equal(proposal.sourceOrOwnerVerdictsCached,false);assert.equal(proposal.historicalStringsRewritten,false);const row=proposal.files[0];replay(row);assert.equal(row.selected.filter(edit=>edit.kind==='actual-current-repository-read').length,4);assert.ok(row.text.includes("export const embedded='readFileSync(new URL(\"../../../src/original.rs\",import.meta.url))';"));
 const again=propose(row.text);assert.equal(again.files.length,0);assert.equal(again.unchanged[0].source,row.text);
});

test('real legacy and nested receiving modules preserve original bytes and all four read behaviors',{timeout:30000},async()=>{
 const home=mkdtempSync(join(tmpdir(),'router-layout-reader-receiving-')),put=(root,name,text)=>{mkdirSync(join(root,name,'..'),{recursive:true});writeFileSync(join(root,name),text);};
 try{for(const nested of [false,true]){
  const root=join(home,nested?'nested':'legacy'),body='pub fn original_source() -> bool { true }\n',cargo='[package]\nname = "reader-receiver"\nversion = "0.0.0"\n';
  put(root,nested?'rust/src/lib.rs':'src/lib.rs',body);put(root,nested?'rust/Cargo.toml':'Cargo.toml',cargo);if(nested)put(root,'Cargo.toml','[workspace]\nmembers = ["rust"]\n');
  const row=propose(source,root).files[0];replay(row);put(root,path,row.text);for(const name of ['tools/translation/repository-layout.mjs','tools/translation/test/fixtures/repository-paths.mjs'])put(root,name,readFileSync(join(repository,name)));
  const module=await import(pathToFileURL(join(root,path)).href);for(const name of ['fromUrl','fromPath','fromRoot'])assert.equal(module[name]('src/lib.rs'),body);assert.equal(module.fromLiteral(),body);assert.equal(module.embedded,'readFileSync(new URL("../../../src/original.rs",import.meta.url))');assert.equal(readFileSync(join(root,nested?'rust/Cargo.toml':'Cargo.toml'),'utf8'),cargo);
  if(!nested){put(root,'tools/translation/test/original-readers.test.mjs',source);const original=await import(pathToFileURL(join(root,'tools/translation/test/original-readers.test.mjs')).href);for(const name of ['fromUrl','fromPath','fromRoot'])assert.equal(original[name]('src/lib.rs'),module[name]('src/lib.rs'));assert.equal(original.fromLiteral(),module.fromLiteral());}
 }}finally{rmSync(home,{recursive:true,force:true});}
});

test('shadowed filesystem imports constructors and fixture roots remain untouched',{timeout:30000},()=>{
 const written=`import fs from 'node:fs';import {join} from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
export function fixture(root,name){return fs.readFileSync(join(root,name),'utf8');}
export function foreign(fs,name){return fs.readFileSync(new URL('../../../'+name,import.meta.url),'utf8');}
export function constructor(URL,name){return fs.readFileSync(new URL('../../../'+name,import.meta.url),'utf8');}
export function pending(name){const fs=import('node:fs');return fs.readFileSync(new URL('../../../'+name,import.meta.url),'utf8');}
export const frozen='fs.readFileSync(new URL("../../../src/lib.rs",import.meta.url))';
`;
 const result=propose(written);assert.equal(result.files.length,0);assert.equal(result.unchanged[0].source,written);
});

test('existing helper aliases retain their bindings while new calls receive actual canonical imports',{timeout:30000},()=>{
 const written='import {repositorySourceURL as prior} from "./fixtures/repository-paths.mjs";\n'+source,row=propose(written).files[0];replay(row);assert.ok(row.text.includes('import {repositorySourceURL as prior}'));assert.ok(row.text.includes('import {repositorySourcePath,repositorySourceURL}'));assert.equal(propose(row.text).files.length,0);
});

test('closed paths complete input budgets malformed modules and duplicate bindings refuse before output',{timeout:30000},()=>{
 assert.throws(()=>deriveRepositoryLayoutReadSources({sources:new Map([['../outside.test.mjs',source]]),repositoryRoot:repository}),/Closed complete/);
 assert.throws(()=>propose(source+'\nconst __duplicate_layout_reader=1;const __duplicate_layout_reader=2;\n'),/already been declared/);
 assert.throws(()=>propose(source+'\nexport function malformed( {\n'),/syntax/);
 assert.throws(()=>propose(' '.repeat(1048577)),/Closed complete/);
});

test('whole real source payloads preserve all original replacement tokens through literal CST equations',{timeout:30000},()=>{
 const tokens=['$&',"$'",'$'+String.fromCharCode(96),'$$','$1','$<named>'],suffix='\nexport const dollarTokens = '+JSON.stringify(tokens)+';\n',written=source+suffix,row=propose(written).files[0];replay(row);assert.equal(row.literalSubstitutions,true);assert.ok(row.text.endsWith(suffix));assert.equal(propose(row.text).files.length,0);
});

test('template reads and genuine tracked-source reexports preserve complete real nested receiving bytes',{timeout:30000},async()=>{
 const written="export async function dynamic(name){const {readFileSync}=await import('node:fs');const {fileURLToPath}=await import('node:url');const {join}=await import('node:path');const root=fileURLToPath(new URL('../../../',import.meta.url));return readFileSync(join(root,name),'utf8');}\n"+
 "export async function tracked(name){const {trackedSource:read}=await import('../bulk.mjs');const {fileURLToPath}=await import('node:url');const root=fileURLToPath(new URL('../../../',import.meta.url));return read(root,name);}\n"+
 "export async function template(name){const {readFileSync}=await import('node:fs');return readFileSync(new URL("+String.fromCharCode(96)+"../../../src/"+'$'+'{name}'+".rs"+String.fromCharCode(96)+",import.meta.url),'utf8');}\n";
 const home=mkdtempSync(join(tmpdir(),'router-layout-template-receiver-')),put=(name,text)=>{mkdirSync(join(home,name,'..'),{recursive:true});writeFileSync(join(home,name),text);};
 try{
  const proposal=propose(written,home),row=proposal.files[0];replay(row);assert.equal(row.selected.filter(edit=>edit.kind!=='actual-helper-import').length,3);assert.ok(row.text.includes('repositorySourcePath(name,root)'));
  const body='pub fn original() -> bool { true }\n';put('rust/Cargo.toml','[package]\nname = "nested"\nversion = "0.0.0"\n');put('rust/src/lib.rs',body);put(path,row.text);
  for(const name of ['tools/translation/repository-layout.mjs','tools/translation/source-corpus.mjs','tools/translation/test/fixtures/repository-paths.mjs'])put(name,readFileSync(join(repository,name)));
  put('tools/translation/bulk.mjs',proposal.trackedSourceReexport.statement+'\n');
  const module=await import(pathToFileURL(join(home,path)).href);assert.equal(await module.dynamic('src/lib.rs'),body);assert.equal(await module.tracked('src/lib.rs'),body);assert.equal(await module.template('lib'),body);assert.equal(propose(row.text,home).files.length,0);
 }finally{rmSync(home,{recursive:true,force:true});}
});
