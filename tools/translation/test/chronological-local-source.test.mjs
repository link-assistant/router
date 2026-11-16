// Independent shared source-timing regression SOURCE. Every case UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {rustTokens} from '../rust-structure.mjs';
import {createChronologicalLocalSource} from '../chronological-local-source.mjs';
import {createBase64LocalArgumentSource} from '../base64-local-argument-source.mjs';
import {createPrimitiveLocalArgumentSource} from '../primitive-local-argument-source.mjs';
import {prepareChronologicalLocalSources} from '../prepare-chronological-local-sources.mjs';
const limits={timeout:60000},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment');
test('separate actual family operations retain their own domains with no previous invocation result',limits,()=>{
 const source='let first=value;probe(first);',rows=tokens(source),probe=rows.find(row=>row.text==='probe');for(const [make,kind]of [[createBase64LocalArgumentSource,'text'],[createPrimitiveLocalArgumentSource,'u64']]){const one=make(rows,new Map([['value',kind]]));assert.equal(one.at(probe.start).get('first'),kind);assert.equal(one.evidence('first').sourceAuthority,false);assert.equal(one.evidence('first').semanticAuthority,false);const two=make(rows,new Map());assert.equal(two.at(probe.start).has('first'),false);}
});
test('only a family-selected complete initializer supplies a result after its real terminator',limits,()=>{
 const source='let flag=selected(value);probe(flag);',rows=tokens(source),start=rows.find(row=>row.text==='selected'),end=rows.find(row=>row.text===';'),probe=rows.find(row=>row.text==='probe'),make=()=>createChronologicalLocalSource(rows,new Map(),{initializerSizes:[1],readOperand:()=>null,acceptResult:event=>event.operation==='source_selected_boolean'?'bool':null,aliasKind:'candidate-alias',resultKind:'candidate-result'}),provider=make();assert.equal(provider.at(start.start).has('flag'),false);provider.selectedCall({span:[start.start,end.start],terminator:end,operation:'unknown'});assert.equal(provider.evidence('flag'),null);provider.selectedCall({span:[start.start,end.start],terminator:end,operation:'source_selected_boolean'});assert.equal(provider.evidence('flag'),null);assert.equal(provider.at(probe.start).get('flag'),'bool');assert.deepEqual(provider.evidence('flag').initializerSpan,[start.start,end.start]);assert.equal(provider.evidence('flag').originalTraitPermission,false);assert.equal(make().at(probe.start).has('flag'),false);
});
test('four complete construction equations retain all original source and both phase inverses',limits,()=>{
 const plan=prepareChronologicalLocalSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
