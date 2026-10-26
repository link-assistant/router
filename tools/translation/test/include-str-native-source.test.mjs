// Independent whole native input SOURCE. All cases remain UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureOriginalIncludeStrNativeFrame,originalIncludeStrNativeSourceFacts} from '../include-str-native-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareIncludeStrNativeSources} from '../prepare-include-str-native-sources.mjs';
const limits={timeout:60000};
test('sixteen complete current native inputs and sixteen full callbacks retain original file path and literal branches',limits,()=>{
 const frame=captureOriginalIncludeStrNativeFrame(),facts=frame.facts;assert.equal(facts.sources.length,16);assert.equal(Object.keys(facts.callbacks).length,16);assert.equal(facts.sources.filter(row=>row.kind==='license').length,2);assert.ok(facts.retainedSourceBytes<=8388608);assert.ok(facts.nativeInventoryCells>0&&facts.nativeInventoryCells<=200000);
 for(const row of facts.sources)if(row.kind==='Rust'){assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.source);assert.equal(row.inverse,row.source);}for(const row of Object.values(facts.callbacks)){const source=facts.sources.find(source=>source.path===row.path);assert.equal(source.source.slice(row.span.start,row.span.end),row.original);assert.ok(row.original.startsWith('fn '));}
 assert.ok(facts.callbacks.includeString.original.includes('std::str::from_utf8'));assert.ok(facts.callbacks.includeString.original.includes('cx.expr_str'));assert.ok(facts.callbacks.loadBinaryFile.original.includes('resolve_path'));assert.ok(facts.callbacks.resolvePath.original.includes('source_callsite'));assert.ok(facts.callbacks.sourceMapLoad.original.includes('read_binary_file'));assert.ok(facts.callbacks.stringExpression.original.includes('escape_string_symbol'));assert.deepEqual(facts.trace.map(row=>row.phase),['language','repository']);
 for(const key of ['originalCallerResolved','sourceFileContextQualified','nativeFileLoaderQualified','nativePathQualified','macroOwnerResolved','globalExportsClosed','sourceAuthority','namespaceAuthority','runtimeAuthority','wholeCompilerExecuted','crossInvocationCache'])assert.equal(facts[key],false,key);assert.ok(facts.remaining.some(reason=>reason.includes('Span')));const current=originalIncludeStrNativeSourceFacts(frame.token);assert.notStrictEqual(current,facts);assert.equal(current.profileSha256,facts.profileSha256);assert.equal(current.nativeInventoryCells,facts.nativeInventoryCells);for(const row of current.sources)assert.equal(row.source,facts.sources.find(prior=>prior.path===row.path).source);
});
test('a copied foreign or schema-shaped source request cannot replace the native private identity',limits,()=>{
 for(const token of [{},{schema:'private-original-include-str-native-source-request-v1'},{schema:'private-original-attribute-expression-confinement-request-v1'},null])assert.throws(()=>originalIncludeStrNativeSourceFacts(token),/copied or foreign/u);
});
test('all three complete compiler equations retain full original source readers native owners and both phases',limits,()=>{
 const plan=prepareIncludeStrNativeSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
