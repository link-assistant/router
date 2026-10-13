import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {rustTokens,sourceItems} from '../rust-structure.mjs';
import {DERIVE_SOURCE_PROFILE,deriveDependencySource,loadDeriveDependencyProof} from '../derive-dependencies.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const originalCommit='688bf9b9a1257a1dc58c758b50b6906ecc4eee63';
const git=args=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024});
const hash=value=>createHash('sha256').update(value).digest('hex');
const fixtureRoot=new URL('../fixtures/static-source-performance/',import.meta.url),inventoryBytes=readFileSync(new URL('original-rust-inputs.json',fixtureRoot));
assert.equal(hash(inventoryBytes),'dd3d5e25091c74e980a5529f33a6d5b311264e32769efce669a0e3efd6a1bff4');
const inventory=JSON.parse(inventoryBytes);
assert.equal(inventory.originalCommit,originalCommit);assert.equal(inventory.originalRustFiles,804);
const originalBytes=readFileSync(new URL('rust-structure.mjs.txt',fixtureRoot));assert.equal(hash(originalBytes),'6195c319a3a01115f160f5519d2f979036ac3845e2774bc25f80e9ab2c26bb18');
const lexerPath='tools/translation/vendor/formal-ai/lexer.mjs';
assert.equal(hash(readFileSync(new URL('../vendor/formal-ai/lexer.mjs',import.meta.url))),inventory.lexer.sha256,'the independent original module uses the identical pinned item lexer');assert.equal(inventory.lexer.path,lexerPath);
const instrument=bytes=>bytes.toString().replace("import { lex, topLevelItems } from './vendor/formal-ai/lexer.mjs';",
  `import {lex as pinnedLex,topLevelItems} from ${JSON.stringify(new URL('../vendor/formal-ai/lexer.mjs',import.meta.url).href)};const masks=[];const lex=(...args)=>{masks.push(args[0]);return pinnedLex(...args);};export const takeMasks=()=>masks.splice(0);`);
const load=bytes=>import('data:text/javascript;base64,'+Buffer.from(instrument(bytes)).toString('base64'));
const original=await load(originalBytes),optimized=await load(readFileSync(new URL('../rust-structure.mjs',import.meta.url)));
function outcome(operation,source){try{return {value:operation(source)};}catch(error){return {error:{name:error.name,message:error.message}};}}
function compare(source,label){
  original.takeMasks();optimized.takeMasks();
  const priorTokens=outcome(original.rustTokens,source),nextTokens=outcome(rustTokens,source);
  assert.deepEqual(outcome(optimized.rustTokens,source),nextTokens,label+' instrumented exact current module');
  assert.deepEqual(nextTokens,priorTokens,label+' complete token values/errors');
  const priorItems=outcome(original.sourceItems,source),nextItems=outcome(sourceItems,source);
  assert.deepEqual(nextItems,priorItems,label+' complete item values/errors');
  assert.deepEqual(outcome(optimized.sourceItems,source),nextItems,label+' instrumented current item module');
  const priorMasks=original.takeMasks(),nextMasks=optimized.takeMasks();assert.deepEqual(nextMasks,priorMasks,label+' entire masked UTF-16 text');
  return {path:label,bytes:Buffer.byteLength(source),sourceSha256:hash(source),maskedTextsSha256:hash(JSON.stringify(nextMasks)),tokensSha256:hash(JSON.stringify(nextTokens)),itemsSha256:hash(JSON.stringify(nextItems)),tokenCount:nextTokens.value?.length??null,itemCount:nextItems.value?.length??null,error:nextTokens.error??null};
}
test('prefix and one-pass masking preserve exact raw char comment Unicode and error behavior',()=>{
  const cases=['','crate return banana carrot','r"x" br#"x"# cr##"x"##','r###"embedded \"## and /* ignored */"###',
    'arr#"x"# _r#"x"# 1r#"x"# érr#"x"# 𐐀r#"x"#','\ud800r#"x"# \udc00br"x"','fn é(){let 🧪=r#"\ud800"#;}',
    '/*a/*b*/c*/ fn f(){let x=\'🧪\';let y=\'\\u{1_f600}\';let z=\'\\x41\';let q=\'\\\'\';}',
    '// r#"ignored\nfn f(){"/*not comment*/"; b"raw prefix is ordinary";}',"fn f<'a>(x:&'a str){'a:loop{break 'a;}}",'/*','/*outer/*inner*/',
    'r#"unterminated','br##"x"#','cr"','"unterminated','fn f(){(]};','r########"x"########'];
  for(const prefix of ['r','br','cr','ar','_r','ér','𐐀r','\ud800r','brr','c','b'])for(const suffix of ['"x"','#"x"#','##"x"##','word','###',''])cases.push(prefix+suffix);
  for(const [index,source]of cases.entries())compare(source,'adversarial-'+index);
  const crowded=Array.from({length:1500},(_,index)=>`/*${index}/*nested*/tail*/ r##"\"# ${index}"## '\\x41'`).join('\n');compare(crowded,'many-ordered-replacements');
});
test('all804 immutable original Rust files and every actual locked derive member match the independent old module',{timeout:120000},t=>{
  const paths=git(['ls-files','-z','--','*.rs']).toString().split('\0').filter(Boolean);
  assert.deepEqual(paths,inventory.rustSources.map(entry=>entry.path),'complete current tracked Rust inventory equals the original804');
  assert.equal(paths.length,804);
  const batch=execFileSync('git',['cat-file','--batch'],{cwd:root,input:paths.map(path=>'HEAD:'+path+'\n').join(''),maxBuffer:64*1024*1024});
  const rows=[];let at=0;const started=performance.now();
  for(const path of paths){const newline=batch.indexOf(10,at),header=batch.subarray(at,newline).toString(),match=/^([a-f0-9]{40}) blob ([0-9]+)$/.exec(header);assert.ok(match,header);const size=Number(match[2]),bytes=batch.subarray(newline+1,newline+1+size);assert.equal(bytes.length,size);const pin=inventory.rustSources[rows.length];assert.equal(size,pin.bytes,path);assert.equal(match[1],pin.gitBlob,path);assert.equal(hash(bytes),pin.sha256,path);const working=new URL('../../../'+path,import.meta.url);if(existsSync(working))assert.deepEqual(readFileSync(working),bytes,path+' existing worktree bytes');rows.push({...compare(bytes.toString('utf8'),path),gitBlob:match[1]});at=newline+size+2;}
  assert.equal(at,batch.length);
  const dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')});
  let members=0;
  for(const entry of DERIVE_SOURCE_PROFILE.packages)for(const path of Object.keys(entry.members)){
    const origin=deriveDependencySource(dependencies,entry.name,path);assert.equal(hash(origin.source),entry.members[path]);rows.push({...compare(origin.source,entry.name+'/'+path),archiveSha256:origin.archiveSha256,sourceSha256:origin.sha256});members++;
  }
  const compilerProfile=JSON.parse(readFileSync(new URL('../source-profiles/builtin-derive-bang/manifest.json',import.meta.url),'utf8'));
  for(const entry of compilerProfile.sources){const packed=readFileSync(new URL('../source-profiles/builtin-derive-bang/'+entry.archive,import.meta.url));assert.equal(packed.length,entry.archiveBytes);assert.equal(hash(packed),entry.archiveSha256);const bytes=gunzipSync(packed,{maxOutputLength:300000});assert.equal(bytes.length,entry.bytes);assert.equal(hash(bytes),entry.sha256);rows.push({...compare(bytes.toString('utf8'),'builtin-compiler/'+entry.path),archiveSha256:entry.archiveSha256});}
  const receipt={schema:'independent-original-lexer-corpus-v1',originalCommit,originalModuleSha256:hash(originalBytes),originalRustFiles:804,lockedDeriveMembers:members,originalCompilerMembers:compilerProfile.sources.length,elapsedMilliseconds:performance.now()-started,rows};
  t.diagnostic(JSON.stringify({...receipt,rows:undefined}));
  t.diagnostic('complete-comparison-base64:'+Buffer.from(JSON.stringify(receipt)).toString('base64'));
});
test('token and item results remain fresh mutable allocations after caller mutation and changed source',()=>{
  const source='/*one/*two*/three*/ fn f(){r#"original"#;}',tokens=rustTokens(source),items=sourceItems(source);
  assert.ok(!Object.isFrozen(tokens));tokens[0].text='changed';tokens.push({text:'forged'});items[0].tokens.length=0;items[0].name='changed';
  assert.deepEqual(rustTokens(source),original.rustTokens(source));assert.deepEqual(sourceItems(source),original.sourceItems(source));
  compare(source.replace('original','changed'),'changed-source');compare(source+' fn second(){}','added-item');
  assert.notStrictEqual(rustTokens(source)[0],rustTokens(source)[0]);assert.notStrictEqual(sourceItems(source)[0].tokens,sourceItems(source)[0].tokens);
});
