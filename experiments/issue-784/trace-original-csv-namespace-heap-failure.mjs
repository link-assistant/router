// Genuine complete associated graph and namespace diagnostic, never a compiler
// result or executable-function count. Original receiving tests remain required.
import {createHash} from 'node:crypto';
import {associatedOriginalInputs,associatedOriginalDependencyInputs} from '../../tools/translation/test/associated-original-context.mjs';
import {resolveModuleGraph} from '../../tools/translation/project.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {registeredStandardHostBindings} from '../../tools/translation/standard-host-bindings.mjs';
import {originalMatchesNamespaceBindings} from '../../tools/translation/matches-macro-context.mjs';
import {lockedTomlValueNamespaceBindings} from '../../tools/translation/toml-value-namespace.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../../tools/translation/derive-footprints.mjs';
import {createDeriveBangContext} from '../../tools/translation/derive-bang-context.mjs';
import {createToolAttributeContext} from '../../tools/translation/tool-attributes.mjs';
import {resolveModuleBindings} from '../../tools/translation/module-bindings.mjs';
import {withDefaultProofByteConsumers} from '../../tools/translation/default-proof-byte-operation.mjs';
import {parserSourceScope} from '../../tools/translation/source-scopes.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const started=performance.now(),base='ci-logs/issue-784-restart-2/current-original-csv-namespace';
const hash=value=>createHash('sha256').update(value).digest('hex');
const progress=phase=>console.log(JSON.stringify({phase,elapsedMs:performance.now()-started,memory:process.memoryUsage()}));
function retain(name,value){
 const bytes=Buffer.from(JSON.stringify(value));
 if(bytes.length>32*1024*1024)throw Error('Complete namespace diagnostic evidence bound');
 const target=writeCompleteEvidenceJson(base+'-'+name+'.json',bytes);
 console.log(JSON.stringify({target,bytes:bytes.length,sha256:hash(bytes)}));
}
progress('associated-original-inputs');
const data=associatedOriginalInputs('csv-original-source.test.mjs');
const {manifest,lock}=associatedOriginalDependencyInputs(data);
const dependencies=loadDeriveDependencyProof({manifest,lock});
const paths=data.inputs.sources.filter(row=>row.source.endsWith('.rs')).map(row=>row.source);
retain('inputs',{inputs:data.inputs,association:data.association,scope:data.scope,
 sources:[...paths,'Cargo.toml','Cargo.lock'].map(path=>({path,source:data.source(path)}))});
progress('complete-original-graph');
const graph=resolveModuleGraph({entry:data.inputs.entry,paths,readSource:data.source,compilationProfile:data.inputs.compilationProfile});
retain('graph',graph);
progress('complete-derive-context');
const externalModules=registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(dependencies)]);
const deriveContext=createDeriveFootprintContext({modules:graph.modules,dependencies,externalModules,compilationProfile:graph.compilationProfile});
retain('derive',deriveContext);
progress('complete-bang-context');
const deriveBangContext=createDeriveBangContext({deriveContext});
retain('bang',deriveBangContext);
progress('complete-original-bindings');
const resolvedExternal=deriveFootprintExternalModules(deriveContext);
const toolContext=createToolAttributeContext({modules:graph.modules,externalModules:resolvedExternal,deriveContext,compilationProfile:graph.compilationProfile});
const bindings=withDefaultProofByteConsumers(()=>resolveModuleBindings({modules:graph.modules,externalModules:resolvedExternal,deriveContext,deriveBangContext,toolContext,compilationProfile:graph.compilationProfile}));
retain('bindings',bindings);
for(const file of ['src/storage/associative.rs','src/config.rs']){
 const scopes=bindings.scopes.filter(row=>row.file===file);
 for(const scope of scopes){
  const parser=parserSourceScope(scope,bindings.scopes);
  console.log(JSON.stringify({file,module:scope.path??scope.module,scope,
   parser:{shadowedTypes:[...parser.shadowedTypes??[]],unresolvedTypeScope:parser.unresolvedTypeScope,
    unresolvedBangMacroScope:parser.unresolvedBangMacroScope},
   bang:deriveBangContext.certificates.filter(row=>row.source===file),
   diagnostics:deriveBangContext.diagnostics.filter(row=>row.source===file)}));
 }
}
progress('complete-diagnostic');
console.log(JSON.stringify({productionExecutableGain:0,originalCsvReceivingTestRun:false,fullGatePassed:false,runtimeParity:false,rustExecuted:false}));
