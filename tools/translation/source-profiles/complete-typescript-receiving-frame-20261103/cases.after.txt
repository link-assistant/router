// Storage-only independent source cases. SDK fixtures throw if evaluated.
// No test or SDK execution occurred during source drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {produceCompleteTypeScriptReceivingSourcePackage} from '../complete-typescript-receiving-20261103.mjs';
import {withProtectedNativeWriter} from '../protected-native-writers-20261102.mjs';
const integrity='sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==';
const options={timeout:60000,concurrency:false};
function fixture(t){
 const base=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'complete-sdk-receiving-'))),root=join(base,'source'),sdk=join(root,'js/node_modules/typescript'),destination=join(base,'receiving');
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const put=(path,source)=>{fs.mkdirSync(dirname(path),{recursive:true});fs.writeFileSync(path,source);};
 put(join(root,'js/package.json'),'{"name":"sdk-storage-only","private":true,"devDependencies":{"typescript":"5.9.3"}}\n');
 put(join(root,'js/package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{'node_modules/typescript':{version:'5.9.3',resolved:'https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz',integrity}}})+'\n');
 const files=['package.json','LICENSE.txt','ThirdPartyNoticeText.txt','lib/typescript.js','lib/_tsc.js','lib/tsc.js','bin/tsc','lib/lib.d.ts','lib/extra/😀.txt'];
 for(const name of files)put(join(sdk,name),name==='package.json'?'{"name":"typescript","version":"5.9.3","main":"lib/typescript.js"}\n':name.endsWith('.js')?'throw Error("storage-only SDK must never execute");\n':'original '+name+'\r\n');
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
 const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false','-c','commit.gpgsign=false',...args],{cwd:root,env,timeout:10000,maxBuffer:8388608,encoding:'utf8'});
 git('init','--quiet','--template=');git('add','--','js/package.json','js/package-lock.json');git('-c','user.name=Source storage','-c','user.email=source@example.invalid','commit','--quiet','-m','source metadata');
 return {base,root,sourceRoot:root,sdk,destination,files,put};
}
test('complete installed SDK and notices materialize as an independent package without loading it',options,t=>{
 const f=fixture(t),result=produceCompleteTypeScriptReceivingSourcePackage(f);
 assert.equal(result.nativeTypeScriptSourceRoot,join(f.destination,'sdk'));assert.equal(result.completeInstalledPackage,true);
 assert.equal(result.compilerExecuted,false);assert.equal(result.compilerQualified,false);assert.equal(result.receivingQualified,false);assert.equal(result.tarballIntegrityVerified,false);
 assert.deepEqual(result.packageFiles,f.files.slice().sort());
 for(const name of f.files)assert.deepEqual(fs.readFileSync(join(result.root,'js/node_modules/typescript',name)),fs.readFileSync(join(f.sdk,name)));
 for(const name of ['package.json','package-lock.json'])assert.deepEqual(fs.readFileSync(join(result.root,'js',name)),fs.readFileSync(join(f.root,'js',name)));
});
test('wrong lock and missing original notice refuse without retaining an empty outer directory',options,t=>{
 for(const variant of ['lock','notice']){
  const f=fixture(t);if(variant==='lock'){const path=join(f.root,'js/package-lock.json'),value=JSON.parse(fs.readFileSync(path));value.packages['node_modules/typescript'].integrity='unknown';f.put(path,JSON.stringify(value));}
  else fs.unlinkSync(join(f.sdk,'ThirdPartyNoticeText.txt'));
  assert.throws(()=>produceCompleteTypeScriptReceivingSourcePackage(f));assert.equal(fs.existsSync(f.destination),false);
 }
});
test('existing output and linked original SDK resources never become receiving source trees',options,t=>{
 const a=fixture(t);fs.mkdirSync(a.destination);a.put(join(a.destination,'keep'),'unchanged');assert.throws(()=>produceCompleteTypeScriptReceivingSourcePackage(a),/already exists/u);assert.equal(fs.readFileSync(join(a.destination,'keep'),'utf8'),'unchanged');
 const b=fixture(t),outside=join(b.base,'outside.js');b.put(outside,'unowned');fs.unlinkSync(join(b.sdk,'lib/typescript.js'));fs.symlinkSync(outside,join(b.sdk,'lib/typescript.js'));assert.throws(()=>produceCompleteTypeScriptReceivingSourcePackage(b));assert.equal(fs.readFileSync(outside,'utf8'),'unowned');
});
test('a protected external descendant is refused before its fresh container is created',options,t=>{
 const f=fixture(t);f.put(join(f.root,'translation/source-ownership.json'),JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:['protected-sdk-input'],unmanaged:[]}));
 fs.symlinkSync(join(f.destination,'sdk/js/node_modules/typescript/LICENSE.txt'),join(f.root,'protected-sdk-input'));
 assert.throws(()=>produceCompleteTypeScriptReceivingSourcePackage(f));assert.equal(fs.existsSync(f.destination),false);
});
test('source and destination accessors and proxy options cannot run before source-policy capture',()=>{
 let invoked=0;const input={destination:'/unused'};Object.defineProperty(input,'sourceRoot',{get(){invoked++;throw Error('must not call');}});
 assert.throws(()=>produceCompleteTypeScriptReceivingSourcePackage(input),/own source\/destination/u);assert.equal(invoked,0);
 const proxy=new Proxy({},{get(){invoked++;},getOwnPropertyDescriptor(){invoked++;},getPrototypeOf(){invoked++;}});
 assert.throws(()=>produceCompleteTypeScriptReceivingSourcePackage(proxy),/ordinary own/u);assert.equal(invoked,0);
});
test('a nested different-root SDK producer cannot create a subtree inside an outer protected directory',options,t=>{
 const f=fixture(t),outer=join(f.base,'outer'),protectedDirectory=join(outer,'protected');
 fs.mkdirSync(protectedDirectory,{recursive:true});f.put(join(outer,'translation/source-ownership.json'),JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:['protected'],unmanaged:[]}));
 const destination=join(protectedDirectory,'new-sdk-package');let entered=false;
 assert.throws(()=>withProtectedNativeWriter(outer,()=>{entered=true;return produceCompleteTypeScriptReceivingSourcePackage({sourceRoot:f.root,destination});}));
 assert.equal(entered,true);assert.equal(fs.existsSync(destination),false);assert.deepEqual(fs.readdirSync(protectedDirectory),[]);
});
