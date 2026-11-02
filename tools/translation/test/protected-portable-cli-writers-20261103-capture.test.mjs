// Genuine public capture API future cases. No API/SCM/parser executed this phase.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {captureNativePortableLayoutHistory} from '../native-portable-layout-history.mjs';
import {withProtectedNativeWriter} from '../protected-native-writers-20261102.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),limits={timeout:60000,concurrency:false};
function fixture(t){const base=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'protected-portable-capture-')));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));const root=join(base,'outer');fs.mkdirSync(root);const put=(path,value)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),value);};return {root,base,put,output:join(base,'new-history')};}
test('actual capture API retains complete pinned source packet gzip manifest notice and fresh wx output',limits,t=>{const a=fixture(t),result=captureNativePortableLayoutHistory({root:ROOT,output:a.output});assert.equal(result.output,a.output);assert.equal(result.sourceInstalled,false);assert.equal(result.runtimeAuthority,false);const manifest=JSON.parse(fs.readFileSync(join(a.output,'manifest.json'),'utf8')),packed=fs.readFileSync(join(a.output,'originals.json.gz')),raw=gunzipSync(packed,{maxOutputLength:2097152}),packet=JSON.parse(raw);assert.equal(manifest.bytes,packed.length);assert.equal(manifest.rawBytes,raw.length);assert.equal(packet.files.length,2);assert.equal(packet.authority.source,false);assert.equal(packet.authority.execution,false);assert.ok(fs.readFileSync(join(a.output,'NOTICE'),'utf8').includes('Complete original Router test sources'));assert.throws(()=>captureNativePortableLayoutHistory({root:ROOT,output:a.output}),/fresh output required/u);});
test('outer active policy future child alias is vetoed before capture creates any external directory',limits,t=>{const a=fixture(t);a.put('translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:['owned'],unmanaged:[]}));fs.symlinkSync(join(a.output,'originals.json.gz'),join(a.root,'owned'));assert.throws(()=>withProtectedNativeWriter(a.root,()=>captureNativePortableLayoutHistory({root:ROOT,output:a.output})),/policy.*alias|authored|unmanaged/u);assert.equal(fs.existsSync(a.output),false);assert.equal(fs.readlinkSync(join(a.root,'owned')),join(a.output,'originals.json.gz'));});
