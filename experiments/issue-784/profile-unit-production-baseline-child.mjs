// Exact complete first production input from the original receiving case.
// Diagnostic progress only; the controller deliberately stops its observation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {currentCoreApplicationSourceEquations,currentCoreApplicationSource} from '../../tools/translation/test/current-unit-unicode-source-composition.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../../tools/translation/router-core-source-data.mjs';
import {translateProjectOwnedDefinitions} from '../../tools/translation/project.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const packed=readFileSync(new URL('../../tools/translation/source-profiles/core-unit-matches/application.json.gz',import.meta.url));
assert.equal(hash(packed),'b7c0ebc842ab8c710abdfd19111ac1e4e487d8ddfcb075559bbd1c12c64443e0');
const raw=gunzipSync(packed,{maxOutputLength:16000000});assert.equal(hash(raw),'df6c21e737df57e67d9580a6a6edc624350de0800a2cb87b9ed7c68b66dea2ec');
const packet=JSON.parse(raw),equations=currentCoreApplicationSourceEquations(packet);
const original=Object.fromEntries(packet.files.filter(row=>row.path.startsWith('rust/src/')&&row.path.endsWith('.rs')).map(row=>[row.path.slice(5),currentCoreApplicationSource(row,equations)]));
for(const [path,row]of Object.entries(equations))if(row.added)original[path.slice(5)]=row.source;
original['src/translation_core.rs']=ROUTER_FORMATTING_FACADE_SOURCE;
original['src/translation_core/primitives.rs']=ROUTER_CORE_PRIMITIVES_SOURCE;
const cargo=Object.fromEntries(packet.files.filter(row=>['Cargo.toml','rust/Cargo.toml','Cargo.lock'].includes(row.path)).map(row=>{assert.equal(readFileSync(new URL('../../'+row.path,import.meta.url),'utf8'),row.source);return [row.path,row.source];}));
const dependencyInputs={manifest:cargo['rust/Cargo.toml'],lock:cargo['Cargo.lock']};
const started=performance.now();
const result=translateProjectOwnedDefinitions({entry:'src/lib.rs',paths:Object.keys(original),readSource:path=>original[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:dependencyInputs.manifest,cargoManifestPath:'rust/Cargo.toml',deriveDependencies:loadDeriveDependencyProof(dependencyInputs),progress:event=>process.stdout.write(JSON.stringify({event,elapsedMs:performance.now()-started,memory:process.memoryUsage()})+'\n')});
process.stdout.write(JSON.stringify({completed:true,executable:result.meta.executable.length,deadlineQualified:false})+'\n');
