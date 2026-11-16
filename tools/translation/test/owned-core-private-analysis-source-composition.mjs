// Complete current source equations; no executable or source-owner authority.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {restoreOwnedStringOperations} from '../owned-string-operation-rules.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
export function assertOwnedCorePrivateAnalysisSourceComposition(layer,prior,finalSources){
 assert.equal(layer.schema,'owned-core-private-analysis-retention-source-v1');assert.equal(layer.typescriptVersion,'5.9.3');assert.equal(layer.defaultAdoption,true);assert.equal(layer.files.length,1);assert.equal(layer.sourceAuthority,false);assert.equal(layer.runtimeAuthority,false);assert.equal(layer.runtimeExecuted,false);assert.equal(layer.rustExecuted,false);assert.equal(layer.sourceChecksUnchanged,true);assert.equal(layer.hashCallbacksUnchanged,true);
 const row=layer.files[0];assert.equal(row.path,'tools/translation/js-to-rust/owned-core-operations.mjs');
 if(Object.hasOwn(prior,row.path))assert.equal(row.before,prior[row.path].after,row.path+': exact complete predecessor');
 assert.ok(Object.hasOwn(finalSources,row.path),row.path+': explicit final source required');assert.equal(restoreOwnedStringOperations(row.path,finalSources[row.path].after),row.after);assert.equal(row.current,finalSources[row.path].after);assert.equal(restoreOwnedStringOperations(row.path,readFileSync(new URL(row.path,root),'utf8')),row.after);
 assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);assert.equal(row.inverse,row.before);assert.equal(row.selection.nativeInverse,row.before);assert.equal(row.selection.nativeLexicalBindings,true);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.deepEqual(row.trace,row.stages.flatMap(stage=>stage.trace));
 for(const stage of row.stages){assert.equal(stage.before,stage.phase==='language'?row.before:row.language);assert.equal(stage.after,stage.phase==='language'?row.language:row.after);assert.equal(stage.completeInverse,true);assert.deepEqual(stage.trace.map(event=>event.phase),['language','repository']);assert.equal(stage.trace.find(event=>event.phase===stage.phase).rules.length,1);assert.equal(stage.trace.find(event=>event.phase!==stage.phase).rules.length,0);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
 assert.equal(row.sourceLanguage,'JavaScript');assert.equal(row.completeNativeAstCopy,true);assert.equal(row.nativeCopies.length,2);assert.deepEqual(row.nativeCopies.map(copy=>copy.source),[row.before,row.after]);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));
 const edit=row.selection.rule;assert.equal(row.before.slice(...edit.span),edit.expected);assert.equal(row.after,row.before.slice(0,edit.span[0])+edit.replacement+row.before.slice(edit.span[1]));
 assert.equal(hash(restoreOwnedStringOperations(row.path,readFileSync(new URL(row.path,root),'utf8'))),row.afterSha256);assert.equal(readFileSync(new URL(row.path,root),'utf8'),finalSources[row.path].after,row.path+': fresh complete physical source at exit');
}
