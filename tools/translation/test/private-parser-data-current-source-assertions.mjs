import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
export function assertPrivateParserDataCurrentComposition(current,{root=ROOT}={}){
 assert.equal(current.schema,'private-parser-DATA-current-source-composition-v1');assert.equal(current.defaultChanged,false);assert.equal(current.receivingQualified,false);assert.equal(current.performanceQualified,false);assert.equal(current.sourceAuthority,false);assert.equal(current.runtimeAuthority,false);assert.equal(current.nativeImportJoins.length,3);assert.ok(current.nativeImportJoins.every(row=>row.references.length>=2&&row.sourceAuthority===false&&row.runtimeAuthority===false));assert.equal(current.layers.length,1);assert.equal(current.files.length,current.kind==='adoption'?3:1);
 for(const row of current.files){assert.equal(row.current,readFileSync(resolve(root,row.path),'utf8'));if(current.kind==='adoption'){assert.ok(row.current===row.before||row.current===row.after);if(current.installed)assert.equal(row.current,row.after);}else assert.equal(row.current,current.finalSources[row.path]);assert.equal(row.after,current.finalSources[row.path]);assert.equal(row.inverse,row.before);assert.equal(row.completeOriginalInverse,true);assert.ok(row.beforeMeta);assert.ok(row.afterMeta);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepStrictEqual(row.trace,['language','repository']);assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);assert.equal(row.inverseSequence.languageRules[0].edits[0].replacement,row.before);}
 for(const row of current.inputs)assert.equal(readFileSync(resolve(root,row.path),'utf8'),row.source);
 const birth=current.birth.files[0];assert.equal(birth.inverse,birth.before);assert.equal(birth.nativeBindings.nativeSemanticScopeChecked,true);assert.ok(birth.beforeMeta);assert.ok(birth.afterMeta);assert.equal(current.birth.historicalSourceArchive.sha256,current.historicalSourceArchive.sha256);assert.ok(current.birth.physicalInputs.length===3);
}
