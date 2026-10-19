import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {chmodSync,existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,renameSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {exportTranslatorBundle} from '../export-bundle.mjs';
import {discoverCompilerSourceInputs} from '../compiler-source-inputs.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(cwd,args)=>execFileSync('git',args,{cwd,timeout:10000,stdio:'pipe'});
function fixture(){
  const directory=mkdtempSync(join(tmpdir(),'router-translator-export-')),source=join(directory,'source');mkdirSync(source);
  const paths=['scripts/translate-router.mjs','tools/translation/bulk.mjs','tools/translation/vendor/meta-language/package.json','tools/translation/source-profiles/original/full.rs.gz','tools/translation/source-profiles/original/LICENSE.txt'];
  for(const path of paths){mkdirSync(join(source,path,'..'),{recursive:true});writeFileSync(join(source,path),path+'\n');}
  chmodSync(join(source,paths[0]),0o755);
  git(source,['init','--quiet']);git(source,['add','--force','.']);
  git(source,['-c','user.name=Translation fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Original compiler inputs']);
  return {directory,source,paths,output:join(directory,'bundle')};
}
function withFixture(operation){const row=fixture();try{return operation(row);}finally{rmSync(row.directory,{recursive:true,force:true});}}
function retainConcreteExport(value){
  const directory=process.env.ROUTER_CST_EXPORT_VECTORS;if(!directory)return;
  mkdirSync(directory,{recursive:true});
  writeFileSync(join(directory,'complete-receiving-cst.json.gz'),gzipSync(JSON.stringify(value),{level:9}));
}

test('complete committed offline compiler exports deterministically with full source/license bytes',{timeout:360000},()=>{
  const directory=mkdtempSync(join(tmpdir(),'router-translator-export-real-'));
  try{
    const first=exportTranslatorBundle({sourceRoot:root,output:join(directory,'first')}),second=exportTranslatorBundle({sourceRoot:root,output:join(directory,'second')});
    assert.deepEqual(first.manifest,second.manifest);assert.equal(first.manifest.runtimeParity,false);
    assert.equal(JSON.stringify(first.manifest).includes(directory),false);assert.equal(JSON.stringify(first.manifest).includes(root),false);
    assert.equal(first.manifest.files,first.manifest.inputs.length);
    assert.equal(first.manifest.totalSourceBytes,first.manifest.inputs.reduce((sum,row)=>sum+row.bytes,0));
    assert.equal(first.manifest.sourceInventorySha256,sha(Buffer.from(JSON.stringify(first.manifest.inputs))));
    assert.deepEqual(first.manifest.compilerIndex,{kind:'fresh-unborn-enumeration',objectFormat:first.manifest.sourceHead.length===40?'sha1':'sha256',sourceHeadPresent:false,namespaceAuthority:false});
    for(const bundle of [first,second]){
      assert.throws(()=>git(bundle.destination,['rev-parse','--verify','HEAD']));
      assert.equal(git(bundle.destination,['ls-files','--stage','-z']).toString(),bundle.manifest.inputs.map(row=>`${row.mode} ${row.gitBlob} 0\t${row.path}\0`).join(''));
      assert.equal(git(bundle.destination,['ls-files','--others','-z','--','tools/translation/source-profiles']).toString(),'');
    }
    for(const row of first.manifest.inputs){
      const original=readFileSync(join(root,row.path)),copied=readFileSync(join(first.destination,row.path));
      assert.ok(copied.equals(original),row.path);assert.equal(copied.length,row.bytes);assert.equal(sha(copied),row.sha256);
      assert.equal((lstatSync(join(first.destination,row.path)).mode&0o111)?'100755':'100644',row.mode);
    }
    for(const family of ['extensions/','vendor/','source-profiles/'])assert.ok(first.manifest.inputs.some(row=>row.path.startsWith('tools/translation/'+family)));
    assert.ok(first.manifest.inputs.some(row=>/license|notice/iu.test(row.path)));
    assert.ok(first.manifest.inputs.every(row=>!row.path.startsWith('tools/translation/meta/')&&!row.path.startsWith('tools/translation/test/')&&!row.path.includes('node_modules')));
    assert.equal(first.manifest.inputs.some(row=>row.path==='tools/translation/check-typescript-fixtures.mjs'),true);
    const exportedPaths=new Set(first.manifest.inputs.map(row=>row.path));
    for(const input of discoverCompilerSourceInputs({root}))assert.ok(exportedPaths.has(input.path),input.path);
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('the exported synchronization CLI generates and updates real receiving JavaScript through meta, Rust and strict TypeScript',{timeout:180000},async()=>{
  const directory=mkdtempSync(join(tmpdir(),'router-export-sync-'));
  try{
    const bundle=exportTranslatorBundle({sourceRoot:root,output:join(directory,'bundle')});
    assert.ok(bundle.manifest.inputs.some(row=>row.path==='scripts/sync-router.mjs'));
    assert.ok(bundle.manifest.inputs.some(row=>row.path==='tools/translation/js-to-rust/vendor/constructs.lino'));
    const receiving=join(directory,'receiving');mkdirSync(receiving);
    const put=(name,value)=>{const file=join(receiving,name);mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,value);};
    const policy='/** @param {number} x @returns {number} */ export function increment(x) { return x + 1; }\n';
    put('js/package.json','{"name":"receiving-sync","version":"1.0.0","type":"module"}\n');
    put('js/portable/policy.mjs',policy);
    put('js/src/core.mjs','export function observed() { return 7; }\n');
    put('js/index.js','export const receiving = true;\n');
    put('js/testing.js','export const testing = true;\n');
    put('js/catalog.json','{"operations":[]}\n');
    put('parity/fixtures/js-first/policy.json',JSON.stringify({cases:[{id:'increment-seven',function:'increment',args:[7],expected:8}]}));
    put('parity/fixtures/js-first/unsupported.json','[]\n');
    const original='pub fn original() -> bool { true }\n';put('src/original.rs',original);
    const require=createRequire(join(root,'js/package.json'));
    const dependencies=join(require.resolve('typescript/package.json'),'../..');
    symlinkSync(dependencies,join(receiving,'js/node_modules'),'dir');
    git(receiving,['init','--quiet']);put('.git/info/exclude','node_modules/\n');git(receiving,['add','.']);
    git(receiving,['-c','user.name=Translation fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Independent receiving sources']);
    const cli=join(bundle.destination,'scripts/sync-router.mjs');
    const run=(mode,name)=>{
      const output=join(directory,name);
      const result=spawnSync(process.execPath,[cli,mode,'--root',receiving,'--direction','javascript-to-rust','--output',output],{cwd:receiving,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:join(directory,'unrelated-compiler')},encoding:'utf8',timeout:30000});
      const receipt=existsSync(join(output,'receipt.json'))?JSON.parse(readFileSync(join(output,'receipt.json'))):null;
      const logs=receipt?.records.flatMap(row=>(row.logs??[]).map(log=>({path:log.path,content:readFileSync(join(output,log.path),'utf8')})))??[];
      if(result.status!==0){
        const retained=join(root,'js/node_modules/.issue-759-verification/exported-sync-child-failures');mkdirSync(retained,{recursive:true});
        const failure=mkdtempSync(join(retained,'receiving-'));writeFileSync(join(failure,'command.json'),JSON.stringify({mode,name,cli,receiving,exitCode:result.status,error:result.error?.message})+'\n');
        writeFileSync(join(failure,'stdout.raw.log'),result.stdout??'');writeFileSync(join(failure,'stderr.raw.log'),result.stderr??'');
        if(receipt)writeFileSync(join(failure,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
        for(const log of logs)writeFileSync(join(failure,log.path),log.content);
        console.error('EXPORTED_SYNC_FAILED_CHILD '+failure);
      }
      assert.equal(result.status,0,JSON.stringify({stdout:result.stdout,stderr:result.stderr,error:result.error?.message,receipt,logs}));
      return JSON.parse(result.stdout);
    };
    assert.equal(run('--write','first').exitCode,0);
    const rust=readFileSync(join(receiving,'src/generated_js_first/policy.rs'),'utf8');
    const {parseMeta}=await import(pathToFileURL(join(bundle.destination,'tools/translation/js-to-rust/translator.mjs')));
    const {evaluate}=await import(pathToFileURL(join(bundle.destination,'tools/translation/js-to-rust/interpreter.mjs')));
    const {compileNativeTypeScript}=await import(pathToFileURL(join(bundle.destination,'tools/translation/js-to-rust/native-typescript.mjs')));
    assert.equal(evaluate(parseMeta(readFileSync(join(receiving,'tools/translation/js-to-rust/generated/policy.lino'),'utf8')),'increment',[7]),8);
    assert.equal(compileNativeTypeScript(receiving,{sourceRoot:receiving}).compiler,'5.9.3');
    put('js/portable/policy.mjs',policy.replace('x + 1','x + 2'));
    put('js/src/core.mjs','export function observed() { return 9; }\n');
    put('parity/fixtures/js-first/policy.json',JSON.stringify({cases:[{id:'increment-seven',function:'increment',args:[7],expected:9}]}));
    const changed=run('--write','changed');assert.equal(changed.exitCode,0);assert.equal(changed.originalInputsUnchanged,true);
    assert.notEqual(readFileSync(join(receiving,'src/generated_js_first/policy.rs'),'utf8'),rust);
    assert.equal(evaluate(parseMeta(readFileSync(join(receiving,'tools/translation/js-to-rust/generated/policy.lino'),'utf8')),'increment',[7]),9);
    assert.equal(compileNativeTypeScript(receiving,{sourceRoot:receiving}).compiler,'5.9.3');
    const ts=require('typescript'),native=readFileSync(join(receiving,'ts/src/core.ts'),'utf8');
    const erased=ts.transpileModule(native,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
    const observed=await import('data:text/javascript;base64,'+Buffer.from(erased).toString('base64'));assert.equal(observed.observed(),9);
    const fresh=run('--check','fresh');assert.equal(fresh.exitCode,0);assert.equal(fresh.artifactsCurrent,true);assert.equal(fresh.wholeSourceSynchronization,false);assert.equal(fresh.rustExecuted,false);
    assert.equal(readFileSync(join(receiving,'src/original.rs'),'utf8'),original);
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('the complete exported CST extension feeds edited source into both checked translation directions',{timeout:60000},async()=>{
  const directory=mkdtempSync(join(tmpdir(),'router-export-concrete-'));
  try{
    const bundle=exportTranslatorBundle({sourceRoot:root,output:join(directory,'bundle')});
    const paths=new Set(bundle.manifest.inputs.map(row=>row.path));
    for(const name of ['concrete-syntax-meta.mjs','forward-concrete-syntax.mjs','js-to-rust/concrete-source.mjs'])assert.ok(paths.has('tools/translation/'+name),name);
    const load=name=>import(pathToFileURL(join(bundle.destination,'tools/translation',name)).href);
    // The receiving application supplies the installed native grammar/compiler
    // dependency; the exported source manifest never pretends to vendor it.
    const receivingPackage=join(bundle.destination,'js');mkdirSync(receivingPackage,{recursive:true});
    writeFileSync(join(receivingPackage,'package.json'),'{"type":"module","private":true}\n');
    const require=createRequire(join(root,'js/package.json'));
    symlinkSync(join(require.resolve('typescript/package.json'),'../..'),join(receivingPackage,'node_modules'),'dir');
    const concrete=await load('concrete-syntax-meta.mjs'),forward=await load('translate.mjs');
    const priorCompilerRoot=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT;let reverse,interpreter;
    try{
      process.env.ROUTER_NATIVE_TS_SOURCE_ROOT=bundle.destination;
      reverse=await load('js-to-rust/translator.mjs');interpreter=await load('js-to-rust/interpreter.mjs');
    }finally{if(priorCompilerRoot===undefined)delete process.env.ROUTER_NATIVE_TS_SOURCE_ROOT;else process.env.ROUTER_NATIVE_TS_SOURCE_ROOT=priorCompilerRoot;}
    const rust='\ufeff// receiving source: \u03bb\r\npub fn choose(flag: bool) -> u8 { if flag { 7 } else { 9 } }\r\n';
    const javascript='\ufeff/** @param {boolean} flag @returns {number} */\r\n// receiving source: \u03bb\r\nexport function choose(flag) { return flag ? 7 : 9; }\r\n';
    const inputs=[],observations=[];
    for(const [language,source] of [['Rust',rust],['JavaScript',javascript]]){
      const document=concrete.createConcreteSyntaxMeta(source,{language}),serialized=concrete.serializeConcreteSyntaxMeta(document),parsed=concrete.parseConcreteSyntaxMeta(serialized);
      assert.equal(concrete.reconstructConcreteSyntax(parsed),source);
      assert.deepEqual(Buffer.from(concrete.reconstructConcreteSyntax(parsed)),Buffer.from(source));
      const start=source.indexOf('7'),edited=concrete.applyConcreteSyntaxSubstitutions(parsed,{languageRules:[{id:'language:receiving-seven-to-eleven',edits:[{span:[start,start+1],expected:'7',replacement:'11'}]}],repositoryRules:[]});
      const updated=source.slice(0,start)+'11'+source.slice(start+1),editedMeta=concrete.serializeConcreteSyntaxMeta(edited.value);
      assert.equal(concrete.reconstructConcreteSyntax(concrete.parseConcreteSyntaxMeta(editedMeta)),updated);
      inputs.push({language,source,serialized,editedMeta,updated,trace:edited.trace});
    }
    const original=forward.translateSourceConcreteSyntaxMeta(inputs[0].serialized,'src/receiving.rs'),edited=forward.translateSourceConcreteSyntaxMeta(inputs[0].editedMeta,'src/receiving.rs');
    const originalReverse=reverse.translateConcreteSyntaxMeta(inputs[1].serialized),editedReverse=reverse.translateConcreteSyntaxMeta(inputs[1].editedMeta);
    retainConcreteExport({manifest:bundle.manifest,inputs,original,edited,originalReverse,editedReverse,RustExecuted:false,scope:'bounded complete receiving examples; full repository synchronization remains unproved'});
    assert.equal(original.ir.sourceSha256,sha(Buffer.from(rust)));
    assert.equal(edited.ir.sourceSha256,sha(Buffer.from(inputs[0].updated)));
    assert.equal(concrete.reconstructConcreteSyntax(original.ir.concreteSyntaxMeta),rust);
    assert.equal(concrete.reconstructConcreteSyntax(edited.ir.concreteSyntaxMeta),inputs[0].updated);
    for(const [result,expected] of [[original,7n],[edited,11n]])await verifyTypedTargets(result,api=>{
      assert.equal(api.choose(true),expected);assert.equal(api.choose(false),9n);assert.throws(()=>api.choose(1),TypeError);
      observations.push({direction:'Rust-to-JavaScript/TypeScript',expected:String(expected),falseResult:String(api.choose(false))});
    },{childTimeoutMs:20000});
    const native=await import('data:text/javascript;base64,'+Buffer.from(javascript).toString('base64'));
    assert.equal(native.choose(true),7);assert.equal(native.choose(false),9);
    for(const [result,input,expected] of [[originalReverse,inputs[1].source,7],[editedReverse,inputs[1].updated,11]]){
      const checked=reverse.parseMeta(result.meta);
      assert.equal(interpreter.evaluate(checked,'choose',[true]),expected);assert.equal(interpreter.evaluate(checked,'choose',[false]),9);
      assert.match(result.rust,/fn choose\(/u);
      await verifyTypedTargets({javascript:input+'\nexport const translated = {choose};\n',typescript:result.typescript+'\nexport const translated = {choose};\n'},api=>{
        assert.equal(api.choose(true),expected);assert.equal(api.choose(false),9);
        observations.push({direction:'JavaScript-to-checked-meta/TypeScript',expected,falseResult:api.choose(false)});
      },{childTimeoutMs:20000});
    }
    const unsupported=concrete.serializeConcreteSyntaxMeta(concrete.createConcreteSyntaxMeta('export function refuse(){return new WeakMap();}',{language:'JavaScript'}));
    assert.throws(()=>reverse.translateConcreteSyntaxMeta(unsupported));
    retainConcreteExport({manifest:bundle.manifest,inputs,original,edited,originalReverse,editedReverse,unsupported,observations,RustExecuted:false,scope:'bounded complete receiving examples; full repository synchronization remains unproved'});
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('export isolates inherited Git overrides and preserves both unrelated indices',{timeout:180000},()=>withFixture(row=>{
  const sourceIndex=join(row.source,'.git/index'),originalIndex=readFileSync(sourceIndex),foreignIndex=join(row.directory,'foreign-index');
  writeFileSync(foreignIndex,'unrelated index sentinel\n');const foreignBytes=readFileSync(foreignIndex);
  const overrides={GIT_DIR:join(row.directory,'absent-git'),GIT_WORK_TREE:row.directory,GIT_INDEX_FILE:foreignIndex,GIT_COMMON_DIR:join(row.directory,'absent-common'),GIT_OBJECT_DIRECTORY:join(row.directory,'absent-objects'),GIT_ALTERNATE_OBJECT_DIRECTORIES:join(row.directory,'absent-alternates'),GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'core.autocrlf',GIT_CONFIG_VALUE_0:'true'};
  const original=Object.fromEntries(Object.keys(overrides).map(name=>[name,process.env[name]]));
  try{
    Object.assign(process.env,overrides);
    const exported=exportTranslatorBundle({sourceRoot:row.source,output:row.output});
    assert.equal(exported.manifest.inputs.length,row.paths.length);
    assert.ok(readFileSync(sourceIndex).equals(originalIndex));assert.ok(readFileSync(foreignIndex).equals(foreignBytes));
    for(const input of exported.manifest.inputs)assert.ok(readFileSync(join(row.output,input.path)).equals(readFileSync(join(row.source,input.path))));
  }finally{for(const [name,value]of Object.entries(original)){if(value===undefined)delete process.env[name];else process.env[name]=value;}}
  assert.throws(()=>git(row.output,['rev-parse','--verify','HEAD']));
  assert.equal(git(row.output,['ls-files','--stage','-z']).toString().split('\0').filter(Boolean).length,row.paths.length);
}));

test('working compiler byte corruption refuses export before destination creation',()=>withFixture(row=>{
  writeFileSync(join(row.source,row.paths[1]),'changed source\n');
  assert.throws(()=>exportTranslatorBundle({sourceRoot:row.source,output:row.output}),/source bytes or mode differ/);assert.equal(existsSync(row.output),false);
}));

test('staged compiler replacement and an unmerged compiler cannot borrow committed HEAD',()=>withFixture(row=>{
  writeFileSync(join(row.source,row.paths[1]),'staged source\n');git(row.source,['add',row.paths[1]]);
  assert.throws(()=>exportTranslatorBundle({sourceRoot:row.source,output:row.output}),/index differs/);assert.equal(existsSync(row.output),false);
  git(row.source,['reset','--hard','--quiet','HEAD']);
  const blob=git(row.source,['rev-parse','HEAD:'+row.paths[1]]).toString().trim();
  execFileSync('git',['update-index','--index-info'],{cwd:row.source,input:`0 ${'0'.repeat(40)}\t${row.paths[1]}\n100644 ${blob} 1\t${row.paths[1]}\n100644 ${blob} 2\t${row.paths[1]}\n`,timeout:10000,stdio:['pipe','pipe','pipe']});
  assert.throws(()=>exportTranslatorBundle({sourceRoot:row.source,output:row.output}),/unmerged compiler/);assert.equal(existsSync(row.output),false);
}));

test('missing committed input and a replaced physical source symlink both refuse',()=>withFixture(row=>{
  const path=join(row.source,row.paths[1]),original=readFileSync(path);rmSync(path);
  assert.throws(()=>exportTranslatorBundle({sourceRoot:row.source,output:row.output}),/ENOENT/);assert.equal(existsSync(row.output),false);
  const outside=join(row.directory,'outside.mjs');writeFileSync(outside,original);symlinkSync(outside,path);
  assert.throws(()=>exportTranslatorBundle({sourceRoot:row.source,output:row.output}),/regular physical source/);assert.equal(existsSync(row.output),false);
  assert.ok(readFileSync(outside).equals(original));
  rmSync(path);writeFileSync(path,original);
  const tools=join(row.source,'tools'),outsideTools=join(row.directory,'outside-tools');renameSync(tools,outsideTools);symlinkSync(outsideTools,tools);
  assert.throws(()=>exportTranslatorBundle({sourceRoot:row.source,output:row.output}),/source directory link/);assert.equal(existsSync(row.output),false);
  rmSync(tools);renameSync(outsideTools,tools);rmSync(path);symlinkSync(outside,path);
  git(row.source,['add',row.paths[1]]);git(row.source,['-c','user.name=Translation fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Committed link control']);
  assert.throws(()=>exportTranslatorBundle({sourceRoot:row.source,output:row.output}),/committed regular source/);assert.equal(existsSync(row.output),false);
}));

test('an existing or dangling-linked destination is preserved and never overwritten',()=>withFixture(row=>{
  mkdirSync(row.output);const sentinel=join(row.output,'sentinel');writeFileSync(sentinel,'keep\n');
  assert.throws(()=>exportTranslatorBundle({sourceRoot:row.source,output:row.output}),/already exists/);assert.equal(readFileSync(sentinel,'utf8'),'keep\n');
  rmSync(row.output,{recursive:true});symlinkSync(join(row.directory,'absent'),row.output);
  assert.throws(()=>exportTranslatorBundle({sourceRoot:row.source,output:row.output}),/already exists/);assert.equal(lstatSync(row.output).isSymbolicLink(),true);
}));

test('source-overlapping output and bounded oversized files refuse before writing',()=>withFixture(row=>{
  assert.throws(()=>exportTranslatorBundle({sourceRoot:row.source,output:join(row.source,'bundle')}),/separate from the source/);
  writeFileSync(join(row.source,row.paths[1]),Buffer.alloc(4*1024*1024+1));git(row.source,['add',row.paths[1]]);
  git(row.source,['-c','user.name=Translation fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Oversized source control']);
  assert.throws(()=>exportTranslatorBundle({sourceRoot:row.source,output:row.output}),/file budget exceeded/);assert.equal(existsSync(row.output),false);
}));
