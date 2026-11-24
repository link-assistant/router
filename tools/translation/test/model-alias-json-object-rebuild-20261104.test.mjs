// Independent observable object-shape regressions. SOURCE ONLY / UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {router_state_json_rewrite_model_alias as rewrite} from '../json-state-runtime.mjs';
import {json_macro_object as object,json_macro_string as text,json_macro_array as array} from '../json-macro-runtime.mjs';

test('changed canonical objects retain actual pair keys at every rebuilt path',()=>{
 const source=object([
  ['key',text('literal key')],['value',text('literal value')],
  ['model',text('native')],
  ['message',object([['model',text('native')],['key',text('message key')]])],
  ['response',object([['model',text('native')],['modelVersion',text('native')],['value',text('response value')]])],
  ['array',array([object([['model',text('native')]])])],
 ]);
 const expected=object([
  ['key',text('literal key')],['value',text('literal value')],
  ['model',text('visible')],
  ['message',object([['model',text('visible')],['key',text('message key')]])],
  ['response',object([['model',text('visible')],['modelVersion',text('visible')],['value',text('response value')]])],
  ['array',array([object([['model',text('native')]])])],
 ]);
 const result=rewrite(source,'native','visible');
 assert.deepEqual(result,expected);
 assert.equal(source.field0.entries.find(row=>row.key==='model').value.field0,'native');
 assert.deepEqual(rewrite(result,'native','visible'),expected);
});

test('nested-only change rebuilds its parents without adding or losing fields',()=>{
 const source=object([['response',object([['modelVersion',text('native')],['unrelated',text('native')]])],['other',text('unchanged')]]);
 assert.deepEqual(rewrite(source,'native',''),object([['response',object([['modelVersion',text('')],['unrelated',text('native')]])],['other',text('unchanged')]]));
 assert.deepEqual(rewrite(object([]),'native','visible'),object([]));
});
