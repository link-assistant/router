// Fixed fresh-process receiving probe SOURCE; imported as DATA unless invoked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readOrderedMapForwardSourceCapsule,readOrderedMapReverseSourceCapsule} from './ordered-map-cold-capsule-20261102.mjs';
import {prepareOrderedTextMapReverseRuntime,evaluateOrderedTextMapReverseProgram} from './ordered-text-map-callers-20261102-reverse-project.mjs';
import * as maps from './ordered-text-map-20261102-runtime.mjs';
import {hostRuntimeAssets} from './host-assets.mjs';
import {effectRuntimeAssets} from './effect-assets.mjs';
export async function probeOrderedMapColdCapsule(mode,file){
 const text=fs.readFileSync(file,'utf8');
 if(mode==='refuse-forward'){assert.throws(()=>readOrderedMapForwardSourceCapsule(text));return;}
 if(mode==='refuse-reverse'){assert.throws(()=>readOrderedMapReverseSourceCapsule(text));return;}
 if(mode==='reverse'){
  const result=readOrderedMapReverseSourceCapsule(text),token=await prepareOrderedTextMapReverseRuntime(result.program),empty=maps.router_text_map_new(),original=maps.router_text_map_insert(empty,'stream','true');assert.match(result.rust,/text_map_get/u);assert.match(result.typescript,/function/u);assert.equal(evaluateOrderedTextMapReverseProgram(result.program,'count',[original],token),1n);assert.deepEqual(evaluateOrderedTextMapReverseProgram(result.program,'value',[original],token),{$:'Some',field0:'true'});assert.equal(result.privateReceiptsSerialized,false);return;
 }
 if(mode!=='forward')throw TypeError('Unknown fixed cold source/meta probe');
 const directory=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-map-cold-runtime-')));
 try{
  // Allocate the owned target directory before acquiring any source receipts.
  const result=readOrderedMapForwardSourceCapsule(text),assets=hostRuntimeAssets(),effects=effectRuntimeAssets();assets.set('effects.mjs',effects.javascript);assets.set('effects.d.mts',effects.declarations);
  for(const [name,source]of assets){const path=join(directory,'runtime',name);fs.mkdirSync(dirname(path),{recursive:true});fs.writeFileSync(path,source);}
  fs.mkdirSync(join(directory,'src'),{recursive:true});fs.writeFileSync(join(directory,'package.json'),'{"type":"module"}\n');const file=join(directory,'src/lib.mjs');fs.writeFileSync(file,result.javascript);const {translated:api}=await import(pathToFileURL(file).href),empty=api.make(),original=api.inserted(empty,'stream','true');assert.equal(api.count(empty),0n);assert.equal(api.count(original),1n);assert.deepEqual(api.value(original),{$:'Some',field0:'true'});assert.deepEqual(api.value(empty),{$:'None'});assert.equal(result.privateReceiptsSerialized,false);assert.equal(result.runtimeParity,false);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){await probeOrderedMapColdCapsule(process.argv[2],process.argv[3]);console.log(JSON.stringify({schema:'ordered-map-cold-source-meta-probe-v1',mode:process.argv[2],freshProcess:true,privateReceiptsSerialized:false,wholeRouterSynchronization:false}));}
