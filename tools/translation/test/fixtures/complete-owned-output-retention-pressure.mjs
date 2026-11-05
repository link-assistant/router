// Complete original byte retention and live census; DATA only.
import assert from 'node:assert/strict';
import {createPrivateOutputTextMap} from '../../private-flat-native-output-text.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {serializeProjectMetaFieldUtf8} from '../../project-meta-field-flat-json.mjs';
import {planCompressedProjectMetaUtf8ObjectStorage} from '../../project-meta-compressed-storage.mjs';
import {planConsumedProjectMetaUtf8ObjectStorage} from '../../project-meta-consumed-storage.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),path='tools/translation/projects/rust/src/lib.meta.json',output=join(process.env.TMPDIR,'complete-owned-pressure'),mode=process.argv[2],hash=bytes=>createHash('sha256').update(bytes).digest('hex'),fields=['checkedSemanticProgram','targetSemanticProgram','concreteSyntaxMeta'];
const observe=phase=>console.log(JSON.stringify({mode,phase,memory:process.memoryUsage()}));
if(!mode){mkdirSync(output);for(const selected of ['reference','pressure']){const child=spawnSync(process.execPath,['--max-old-space-size=1792','--expose-gc',process.argv[1],selected],{stdio:'inherit',timeout:150000});if(child.status!==0||child.signal||child.error)process.exit(1);}process.exit(0);}
assert.ok(['reference','pressure'].includes(mode));const inputs=[];
function read(name){const bytes=readFileSync(join(root,name));inputs.push({path:name,bytes:bytes.length,sha256:hash(bytes)});return bytes;}
const wrapper=JSON.parse(read(path));assert.equal(wrapper.schema,'bounded-project-meta-storage-v1');
function component(name){const row=wrapper.components.find(row=>row.field===name);assert.ok(row);const bytes=read(row.path);assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);const value=JSON.parse(bytes);if(name==='concreteSyntaxMeta'&&value?.schema==='bounded-concrete-meta-gzip-base64-v1'){assert.deepEqual(Object.keys(value),['schema','bytes','sha256','gzipBase64']);assert.ok(Number.isSafeInteger(value.bytes)&&value.bytes>0&&value.bytes<=64*1024*1024);assert.equal(JSON.stringify(value)+'\n',bytes.toString());const packed=Buffer.from(value.gzipBase64,'base64');assert.equal(packed.toString('base64'),value.gzipBase64);const restored=gunzipSync(packed,{maxOutputLength:64*1024*1024});assert.equal(restored.length,value.bytes);assert.equal(hash(restored),value.sha256);console.log(JSON.stringify({mode,phase:'complete-decoded-concrete-syntax',bytes:restored.length,sha256:hash(restored)}));return JSON.parse(restored);}return value;}
const meta=Object.fromEntries(wrapper.logical.keys.map(name=>[name,fields.includes(name)?component(name):wrapper.root[name]]));assert.deepEqual(Object.keys(meta),wrapper.logical.keys);global.gc();observe('complete-owned-inputs');
const ballast=[];if(mode==='pressure'){while(process.memoryUsage().heapUsed<1650*1024*1024)ballast.push(new Array(1024*1024).fill(0));global.gc();observe('retained-live-heap-pressure');assert.ok(process.memoryUsage().heapUsed>=1640*1024*1024);}
const names=[],planner=mode==='reference'?planCompressedProjectMetaUtf8ObjectStorage:planConsumedProjectMetaUtf8ObjectStorage,start=performance.now();
const plan=planner(path,meta,{serializeUtf8(value){names.push(Object.keys(value)[0]);observe('field-'+names.at(-1));const encoded=serializeProjectMetaFieldUtf8(value);observe('encoded-'+names.at(-1));return encoded;}});observe('complete-storage-returned');
let retained=null;if(mode==='pressure'){
 retained=createPrivateOutputTextMap();observe('root-retain-start');retained.set(path,plan.text);plan.text=undefined;observe('root-retain-end');
 for(const component of plan.components){observe('retain-'+component.field+'-start');retained.set(component.path,component.text);component.text=undefined;observe('retain-'+component.field+'-end');}
 let expectedBytes=0;for(const value of retained.values())expectedBytes+=Buffer.byteLength(value);observe('retained-live-census-end');console.log(JSON.stringify({mode,phase:'retained-output-census',expectedBytes}));
}
if(mode==='pressure'){assert.ok(ballast.length>0);for(const row of ballast){assert.equal(row.length,1024*1024);assert.equal(row[0],0);assert.equal(row.at(-1),0);}assert.deepEqual(names.slice(0,3),fields);for(const field of fields)assert.equal(Object.hasOwn(meta,field),false);}
ballast.length=0;global.gc();assert.deepEqual(JSON.parse(retained?retained.get(path):plan.text).logical,wrapper.logical,'complete reconstructed original logical metadata bytes/hash and key order');
const rows=[{path,text:retained?retained.get(path):plan.text},...plan.components.map(row=>({path:row.path,text:retained?retained.get(row.path):row.text}))],records=[];
for(let at=0;at<rows.length;at++){const row=rows[at],bytes=Buffer.from(row.text),file=join(output,at+'.utf8');if(mode==='reference')writeFileSync(file,bytes,{flag:'wx'});else assert.ok(bytes.equals(readFileSync(file)),'every complete original storage byte: '+row.path);records.push({path:row.path,bytes:bytes.length,sha256:hash(bytes)});}
for(const input of inputs){const bytes=readFileSync(join(root,input.path));assert.equal(bytes.length,input.bytes);assert.equal(hash(bytes),input.sha256);}
const receipt={mode,seconds:(performance.now()-start)/1000,inputs,outputs:records,targets:plan.targets,originalBoundsUnchanged:true,wholeRetainedDataset:true,fullCompilerQualified:false,rustExecuted:false};if(mode==='reference')writeFileSync(join(output,'reference.json'),JSON.stringify(receipt)+'\n');else{const reference=JSON.parse(readFileSync(join(output,'reference.json')));assert.deepEqual(receipt.inputs,reference.inputs);assert.deepEqual(receipt.outputs,reference.outputs);assert.deepEqual(receipt.targets,reference.targets);writeFileSync(join(output,'pressure.json'),JSON.stringify(receipt)+'\n');}console.log(JSON.stringify(receipt));
