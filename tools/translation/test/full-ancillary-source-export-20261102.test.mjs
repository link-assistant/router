// New fixed source-export case SOURCE only; no execution during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {isFullAncillaryCompilerSourcePath,exportFullAncillaryCompilerSourceVault} from '../full-ancillary-source-export-20261102.mjs';
import {readCompactSourceVaultDirectory} from '../compact-source-vault-store-20261102.mjs';
import {withCompactSourceVault,inspectCompactSourceVault} from '../compact-source-vault-20261102.mjs';
const SOURCE=fileURLToPath(new URL('../../../',import.meta.url));
test('compiler byte-scope selection includes unknown suffixes and never promotes excluded cohorts',()=>{
 for(const name of ['tools/translation/source-history.json.gz','tools/translation/kernel.py','tools/translation/NOTICE','tools/translation/extensions/license.txt','tools/translation/js-to-rust/data.unknown'])assert.equal(isFullAncillaryCompilerSourcePath(name),true);
 for(const name of ['rust/src/lib.rs','tools/translation/test/case.mjs','tools/translation/fixtures/blob.json','tools/translation/meta/source.json','tools/translation/projects/root.json','tools/translation/generated/a.mjs','tools/translation/source-profiles/snapshot.txt','tools/translation/new-generated/a.bin'])assert.equal(isFullAncillaryCompilerSourcePath(name),false);
});
test('new explicit scope rejects malformed relative path spellings',()=>{
 for(const name of ['', '../outside','tools//translation/x','/absolute','tools/translation/a\u0000b','tools/translation/a\nb','tools/translation/a\\b','tools/translation/a:b'])assert.throws(()=>isFullAncillaryCompilerSourcePath(name));
});
test('fixed full-source exporter does not invoke accessor/proxy explicit path arrays',()=>{
 let touched=0;const data=[];Object.defineProperty(data,'0',{get(){touched++;return 'LICENSE';},enumerable:true});data.length=1;
 assert.throws(()=>exportFullAncillaryCompilerSourceVault({sourceRoot:SOURCE,output:join(tmpdir(),'unused-export-accessor'),extraPaths:data}),/own data/);assert.equal(touched,0);
 const proxy=new Proxy([],{get(){touched++;throw Error('proxy must not be entered');}});assert.throws(()=>exportFullAncillaryCompilerSourceVault({sourceRoot:SOURCE,output:join(tmpdir(),'unused-export-proxy'),extraPaths:proxy}),/ordinary/);assert.equal(touched,0);
});
test('actual full committed export retains every non-code compiler ancillary byte image',{timeout:3600000,concurrency:false},t=>{
 const parent=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-full-ancillary-')));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));const output=join(parent,'vault');
 const result=exportFullAncillaryCompilerSourceVault({sourceRoot:SOURCE,output});assert.equal(result.ancillarySelection.completeReceivingClosure,false);assert.equal(result.ancillarySelection.compilerQualified,false);
 const model=readCompactSourceVaultDirectory(output);try{const metadata=inspectCompactSourceVault(model).metadata,files=new Set(metadata.files.map(row=>row.path));
  // Independent complete tracked pathname enumeration; no exported summary or
  // hardcoded50-file historical count substitutes for current byte comparisons.
  const raw=execFileSync('git',['-C',SOURCE,'ls-tree','-r','--name-only','-z','HEAD'],{timeout:10000,maxBuffer:8388608}),text=raw.toString('utf8');assert.ok(Buffer.from(text).equals(raw));
  const names=text.split('\0').filter(Boolean).filter(name=>name.startsWith('tools/translation/')).filter(name=>!name.slice('tools/translation/'.length).split('/').some(part=>['test','fixtures','meta','projects','generated','source-profiles'].includes(part)||part.endsWith('-generated')));
  const extra=names.filter(name=>!name.endsWith('.mjs')&&!name.endsWith('.js')&&!name.endsWith('.json')&&!name.endsWith('.mts')&&!name.endsWith('.ts'));assert.ok(extra.length>0);for(const name of names)assert.ok(files.has(name),'missing current compiler-directory input: '+name);
  withCompactSourceVault(model,reader=>{for(const name of extra)assert.ok(reader.read(name).equals(fs.readFileSync(join(SOURCE,name))),'changed ancillary source: '+name);return null;});
 }finally{model.volumes.length=0;model.metadata.files.length=0;model.metadata.objects.length=0;}
});
