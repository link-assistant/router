// Fixed original/extension actual-source and closing cases. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {prepareWidthCountedRangeSourceSuccessor20261104 as prepare,knownWidthCountedRangeSourceSuccessor20261104 as known} from '../width-counted-range-source-history-20261104.mjs';
import {withExactSourceHistoryDataOperation,withExactSourceHistoryDataReservation} from '../exact-source-successors-20261103.mjs';
import {withSourceFailureOperation} from '../source-failure-operations.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/width-counted-range-segments-20261104/',limits={timeout:900000,concurrency:false};
function data(){return JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,'tools/translation/source-profiles/width-counted-ranges-20261104/complete-source.json.gz'))));}
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-width-history-data-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const rows=data().rows,put=(path,source)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),source);},registry=JSON.parse(fs.readFileSync(join(ROOT,BASE+'registry.json'),'utf8'));put(BASE+'registry.json',fs.readFileSync(join(ROOT,BASE+'registry.json')));
 for(const item of registry.segments){const raw=fs.readFileSync(join(ROOT,item.path));put(item.path,raw);const index=JSON.parse(item.encoding==='gzip'?gunzipSync(raw):raw);for(const row of index.rows.filter(row=>rows.some(value=>value.path===row.path)))for(const side of ['before','after'])put(row[side].path,fs.readFileSync(join(ROOT,row[side].path)));}
 for(const row of rows)put(row.path,row.before);return {root,rows,put,registry};
}
test('all six original reader proposals retain complete histories without changing the original499 index',limits,()=>{
 for(const row of data().rows){const result=prepare({path:row.path,before:row.before});assert.ok(result);assert.equal(result.after,row.after);assert.equal(result.inverse,row.before);assert.equal(result.nativeBindingQualified,false);assert.equal(result.sourceInstalled,false);assert.equal(result.completeReceivingClosure,false);}
});
test('fixed sources can be prepared before adoption and known only at their exact physical terminal',limits,t=>{
 const f=fixture(t);for(const row of f.rows){assert.equal(known({path:row.path,before:row.before},{root:f.root}),null);const planned=prepare({path:row.path,before:row.before},{root:f.root});assert.equal(planned.after,row.after);assert.equal(planned.currentIsTerminal,false);f.put(row.path,row.after);const current=known({path:row.path,before:row.before},{root:f.root});assert.ok(current);assert.equal(current.currentIsTerminal,true);assert.equal(current.after,row.after);}
});
test('the actual earlier outcome source edge joins the width extension instead of replacing its original',limits,t=>{
 const f=fixture(t),raw=fs.readFileSync(join(f.root,f.registry.segments[0].path)),index=JSON.parse(gunzipSync(raw)),row=f.rows[0],original=index.rows.find(value=>value.path===row.path);assert.ok(original);const before=fs.readFileSync(join(f.root,original.before.path),'utf8'),result=prepare({path:row.path,before},{root:f.root});assert.ok(result);assert.equal(result.stages.length,2);assert.equal(result.inverse,before);assert.equal(result.after,row.after);
});
test('altered fixed registry or image cannot be restored to hide a caught failure in an enclosing operation',limits,t=>{
 const f=fixture(t),row=f.rows[0],image=JSON.parse(fs.readFileSync(join(f.root,BASE+'index6.json'),'utf8')).rows[0].before.path,original=fs.readFileSync(join(f.root,image));assert.throws(()=>withSourceFailureOperation(()=>{f.put(image,Buffer.concat([original,Buffer.from(' ')]));try{prepare({path:row.path,before:row.before},{root:f.root});}catch{}finally{f.put(image,original);}return true;}),TypeError);assert.ok(prepare({path:row.path,before:row.before},{root:f.root}));const registry=fs.readFileSync(join(f.root,BASE+'registry.json'));f.put(BASE+'registry.json',Buffer.concat([registry,Buffer.from(' ')]));assert.throws(()=>prepare({path:row.path,before:row.before},{root:f.root}),TypeError);
});
test('fixed history reserves against the same original parent budget rather than opening a second allowance',limits,t=>{
 const f=fixture(t),row=f.rows[0];assert.throws(()=>withExactSourceHistoryDataOperation(f.root,()=>withExactSourceHistoryDataReservation(16777215,()=>prepare({path:row.path,before:row.before},{root:f.root}))),TypeError);
});
test('unrelated paths return null without reading any receiving source root',()=>{assert.equal(prepare({path:'js/src/unmanaged.mjs',before:'authored'},{root:'/nonexistent/unused-root'}),null);});
