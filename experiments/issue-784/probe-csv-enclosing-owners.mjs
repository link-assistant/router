// Complete original parent, one-file diagnostic. Not a full project result.
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {associatedOriginalInputs,associatedOriginalDependencyInputs} from '../../tools/translation/test/associated-original-context.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {resolveModuleGraph} from '../../tools/translation/project.mjs';
import {registeredStandardHostBindings} from '../../tools/translation/standard-host-bindings.mjs';
import {originalMatchesNamespaceBindings} from '../../tools/translation/matches-macro-context.mjs';
import {lockedTomlValueNamespaceBindings} from '../../tools/translation/toml-value-namespace.mjs';
import {createDeriveFootprintContext} from '../../tools/translation/derive-footprints.mjs';
import {createDeriveEnclosingNamespaceContext} from '../../tools/translation/derive-enclosing-namespace-context.mjs';

const choices=new Map([['config','src/config.rs'],['associative','src/storage/associative.rs']]);
const [choice,output,...extra]=process.argv.slice(2);
if(!choices.has(choice)||!output?.startsWith('ci-logs/issue-784-restart-2/')||extra.length)throw new TypeError('Select config|associative and one fresh investigation output');
const entry=choices.get(choice),original=associatedOriginalInputs('csv-original-source.test.mjs');
const source=original.source(entry),{manifest,lock}=associatedOriginalDependencyInputs(original);
if(Buffer.byteLength(source)>1_000_000)throw new TypeError('Complete parent exceeds finite probe bound');
const started=performance.now(),compilationProfile=original.inputs.compilationProfile;
const graph=resolveModuleGraph({entry,paths:[entry],compilationProfile,readSource:path=>{
 if(path!==entry)throw new TypeError('One-parent diagnostic cannot admit another source');
 return source;
}});
const dependencies=loadDeriveDependencyProof({manifest,lock});
const externalModules=registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(dependencies)]);
const deriveContext=createDeriveFootprintContext({modules:graph.modules,dependencies,externalModules,compilationProfile});
const context=createDeriveEnclosingNamespaceContext({deriveContext});
const record={scope:'Complete original parent and genuine enclosing-only producers; one-file graph only.',
 entry,source,sourceSha256:createHash('sha256').update(source).digest('hex'),
 elapsedMs:performance.now()-started,deriveContext,context,productionExecutableGain:0};
const raw=Buffer.from(JSON.stringify(record));
if(raw.length>32*1024*1024)throw new TypeError('Complete diagnostic exceeds finite bound');
writeFileSync(output,gzipSync(raw),{flag:'wx'});
console.log(JSON.stringify({entry,sourceSha256:record.sourceSha256,elapsedMs:record.elapsedMs,
 certificates:context.certificates.map(row=>({span:row.span,enclosingOwnerSetClosed:row.enclosingOwnerSetClosed,
 selectedOwners:row.selectedOwners.map(owner=>({path:owner.invocation.path,format:owner.format??null})),
 residualOwners:row.residualOwners})),completeOutputBytes:raw.length,productionExecutableGain:0}));
