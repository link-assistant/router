// Independent source construction invariants. No execution during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareDerivedInverseModule} from '../prepare-derived-inverse-module.mjs';
import {writeNativeSubstitutionCopy} from '../prepare-native-substitution-copy.mjs';
const limits={timeout:60000},hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-native-function-extraction-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const first='export function first(value){return value + 1;}',source=first+'\nexport function untouched(value){return value;}\n',recipe={schema:'derived-inverse-module-v1',id:'fixture:native-function-extraction-v1',path:'tools/derived.mjs',originalPath:'tools/original.mjs',source,bytes:Buffer.byteLength(source),sha256:hash(source),prefix:'// Independent native function extraction\n',parts:[{name:'first',before:first,after:'export function renamed(value){return value + 2;}',afterName:'renamed'}]};mkdirSync(join(root,'tools'),{recursive:true});writeFileSync(join(root,recipe.originalPath),source);const archive='tools/source-recipe.json.gz',writeRecipe=value=>{const packed=gzipSync(JSON.stringify(value));writeFileSync(join(root,archive),packed);return {root,archive,pin:hash(packed),id:recipe.id};},options=writeRecipe(recipe);return {root,recipe,source,options,writeRecipe,plan:()=>prepareDerivedInverseModule(options)};
}
test('the exact complete original function drives the small native module with both inverses',limits,t=>{const api=fixture(t),plan=api.plan(),row=plan.files[0];assert.equal(row.current,null);assert.equal(row.before,api.source);assert.equal(row.inverse,api.source);assert.ok(row.after.includes('function renamed'));assert.equal(row.after.includes('function untouched'),false);assert.deepEqual(row.nativeSelections.language.map(value=>value.name),['first']);assert.deepEqual(row.stages.map(value=>value.phase),['language','repository']);assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);writeNativeSubstitutionCopy(plan,{root:api.root});assert.equal(readFileSync(join(api.root,row.path),'utf8'),row.after);assert.equal(readFileSync(join(api.root,api.recipe.originalPath),'utf8'),api.source);assert.equal(api.plan().files[0].current,row.after);});
test('changed originals unknown current modules wrong native selections and multiple replacement declarations refuse',limits,t=>{
 const api=fixture(t);writeFileSync(join(api.root,api.recipe.originalPath),api.source+'\n// changed');assert.throws(()=>api.plan(),/original source differs/u);writeFileSync(join(api.root,api.recipe.originalPath),api.source);writeFileSync(join(api.root,api.recipe.path),'export const unknown=true;');assert.throws(()=>api.plan(),/unknown physical/u);rmSync(join(api.root,api.recipe.path));
 for(const parts of [[{...api.recipe.parts[0],name:'missing'}],[{...api.recipe.parts[0],before:api.recipe.parts[0].before+' '}],[{...api.recipe.parts[0],after:api.recipe.parts[0].after+'\nexport const injected=true;'}],[{...api.recipe.parts[0],afterName:'different'}]])assert.throws(()=>prepareDerivedInverseModule(api.writeRecipe({...api.recipe,parts})));
});
test('source recipes cannot escape the root waive the original pin or replace the required source format',limits,t=>{const api=fixture(t);assert.throws(()=>prepareDerivedInverseModule({...api.options,pin:'0'.repeat(64)}),/pinned source recipe/u);for(const change of [{path:'../escaped.mjs'},{originalPath:'/outside/original.mjs'},{schema:'unchecked-source-module'},{parts:[]},{source:api.source+' '}])assert.throws(()=>prepareDerivedInverseModule(api.writeRecipe({...api.recipe,...change})));
});
