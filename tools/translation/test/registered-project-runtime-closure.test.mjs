// Independent full registered host/core runtime packaging SOURCE. Unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedCoreRuntimeSources,ownedRegisteredRuntimeSources} from '../js-to-rust/owned-outcome-source.mjs';
import {ownedOutcomeRuntimeAssets} from '../owned-outcome-runtime-assets.mjs';
import {createForwardProjectRuntimeMapping} from '../forward-project-runtime-mapping.mjs';
const limits={timeout:60000};
test('complete original native runtime validator now has an additive full registered source path',limits,()=>{
 const original=ownedCoreRuntimeSources('runtime'),complete=ownedRegisteredRuntimeSources('runtime'),map=new Map(complete.map(row=>[row.path,row.source]));for(const row of original)assert.equal(map.get(row.path),row.source,row.path);assert.equal(new Set(complete.map(row=>row.path)).size,complete.length);for(const name of ['float-runtime.mjs','float-runtime.d.mts','time-runtime.mjs','time-runtime.d.mts','type-layout-runtime.mjs','type-layout-runtime.d.mts','fixed-integer-runtime.mjs','fixed-integer-runtime.d.mts'])assert.ok(map.has('runtime/'+name),name);const actual=ownedOutcomeRuntimeAssets();for(const row of complete)assert.equal(row.source,actual.get(row.path.slice('runtime/'.length)));assert.ok(complete.filter(row=>/\.m(?:js|ts)$/u.test(row.path)).length<=128);
});
test('project runtime mapping retains standard float implementation and declaration pairs under each physical language root',limits,()=>{
 const original='import {rust_f64_floor} from "../../runtime/float-runtime.mjs";\nexport const floor=rust_f64_floor;\n',mapping=createForwardProjectRuntimeMapping(),registered=ownedOutcomeRuntimeAssets();for(const language of ['JavaScript','TypeScript']){const prefix=language==='JavaScript'?'js':'ts',row=mapping.rewrite({source:original,language,sourcePath:language==='JavaScript'?'rust/src/lib.mjs':'rust/src/lib.mts',targetPath:prefix+'/src/module.'+(language==='JavaScript'?'mjs':'mts'),fromRoot:'runtime',toRoot:prefix+'/runtime'}),files=mapping.sources(prefix+'/runtime',row.keys);assert.equal(row.history.inverse,original);for(const name of ['float-runtime.mjs','float-runtime.d.mts'])assert.equal(files.find(row=>row.path===prefix+'/runtime/'+name).source,registered.get(name));}mapping.verify();
});
