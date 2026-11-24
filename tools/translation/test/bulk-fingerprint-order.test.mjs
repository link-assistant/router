import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const repository=new URL('../../../',import.meta.url);
const source='#[derive(Default)] pub struct Payload{flag:bool,count:u32} pub fn make()->Payload{Payload::default()}';
const sha=value=>createHash('sha256').update(value).digest('hex');
function vector(name,value){if(!process.env.ROUTER_BULK_ORDER_VECTORS)return;mkdirSync(process.env.ROUTER_BULK_ORDER_VECTORS,{recursive:true});writeFileSync(join(process.env.ROUTER_BULK_ORDER_VECTORS,name+'.json'),JSON.stringify(value));}
test('actual complete bulk plans preserve every output byte under reversed extension-directory enumeration',{timeout:60000},()=>{
  const directory=mkdtempSync(join(tmpdir(),'router-bulk-order-'));
  try{
    mkdirSync(join(directory,'src'));
    const manifest=readFileSync(repositorySourceURL('Cargo.toml',repository),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',repository),'utf8');
    writeFileSync(join(directory,'src/lib.rs'),source);writeFileSync(join(directory,'Cargo.toml'),manifest);writeFileSync(join(directory,'Cargo.lock'),lock);
    const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
    const git=args=>execFileSync('git',args,{cwd:directory,env,timeout:10000,stdio:'pipe'});
    git(['init','--quiet']);git(['add','.']);git(['-c','core.hooksPath=/dev/null','-c','user.name=Translation fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Bounded original compiler fixture']);
    vector('inputs',{source,manifestSha256:sha(manifest),lockSha256:sha(lock),fixtureKind:'existing bounded generated Default compiler fixture; no Router whole-crate claim'});
    const bulk=new URL('../bulk.mjs',import.meta.url).href,extensions=new URL('../extensions/',import.meta.url).href;
    const results=[];
    for(const mode of ['normal','reverse']){
      const output=join(directory,mode+'.json');
      // The wrapper changes only the real directory enumeration before the
      // original bulk module imports its native fs binding. Compiler sources,
      // parser identities, source/step budgets and generated bodies stay real.
      const program=`
const fs=require('node:fs'),path=require('node:path'),{fileURLToPath}=require('node:url');
const {syncBuiltinESMExports}=require('node:module');
const nativeRead=fs.readdirSync,selected=path.resolve(fileURLToPath(${JSON.stringify(extensions)}));
let presented=null,calls=0;
fs.readdirSync=function(directory,...options){
  const rows=Reflect.apply(nativeRead,this,[directory,...options]);
  const actual=directory instanceof URL?fileURLToPath(directory):directory;
  if(typeof actual==='string'&&path.resolve(actual)===selected&&rows.every(row=>typeof row==='string')){
    calls++;const result=${JSON.stringify(mode)}==='reverse'?[...rows].reverse():[...rows];presented=[...result];return result;
  }
  return rows;
};
syncBuiltinESMExports();
(async()=>{
  const {planRegeneration,applyRegenerationPlan}=await import(${JSON.stringify(bulk)});
  const plan=planRegeneration({root:${JSON.stringify(directory)},sources:['src/lib.rs'],entries:['src/lib.rs']});
  const receipt=applyRegenerationPlan(plan);if(receipt.failures.length)throw Error('actual plan application failed');
  const outputs=plan.outputs.map(row=>({path:row.path,base64:fs.readFileSync(path.join(${JSON.stringify(directory)},row.path)).toString('base64')}));
  fs.writeFileSync(${JSON.stringify(output)},JSON.stringify({mode:${JSON.stringify(mode)},calls,presented,plan,manifestBytes:fs.readFileSync(path.join(${JSON.stringify(directory)},'parity/rust-source-inventory.json')).toString('base64'),outputs}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});`;
      vector(mode+'-program',{program});
      try{execFileSync(process.execPath,['-e',program],{env,timeout:20000,maxBuffer:1024*1024});}catch(error){vector(mode+'-failure',{program,error:{name:error.name,message:error.message,stack:error.stack,stdout:error.stdout?.toString(),stderr:error.stderr?.toString()}});throw error;}
      const result=JSON.parse(readFileSync(output,'utf8'));vector(mode+'-observation',{program,result});vector(mode+'-output-bytes',result.outputs);assert.equal(result.calls,1,'actual original extension seed must see the modified native binding');results.push({program,result});
    }
    const [normal,reversed]=results.map(row=>row.result);
    assert.deepEqual(reversed.presented,[...normal.presented].reverse());assert.notDeepEqual(normal.presented,reversed.presented);
    assert.equal(JSON.stringify(normal.plan),JSON.stringify(reversed.plan),'complete original plan and property order');
    assert.equal(normal.manifestBytes,reversed.manifestBytes,'complete persisted fingerprint bytes');
    assert.deepEqual(normal.outputs,reversed.outputs,'every actual emitted output byte');
    assert.equal(normal.plan.manifest.projects[0].checkedGeneratedMethods,1);assert.equal(normal.plan.manifest.projects[0].executableFunctions,1);assert.equal(normal.plan.manifest.runtimeParity,false);

  }finally{rmSync(directory,{recursive:true,force:true});}
});
