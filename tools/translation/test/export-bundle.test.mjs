import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chmodSync,existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,renameSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exportTranslatorBundle} from '../export-bundle.mjs';
import {discoverCompilerSourceInputs} from '../compiler-source-inputs.mjs';

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
