// Independent general source-rule DATA cases. No source/compiler admission.
import test from 'node:test';
import assert from 'node:assert/strict';
import {countedLiteralSubstitutionRule} from '../counted-literal-substitution-20261102.mjs';
const options={timeout:60000,concurrency:false};
test('exact counted replacements preserve literal dollar patterns, Unicode and complete untouched bytes',options,()=>{const rule=countedLiteralSubstitutionRule('language:whole-source','old','$&😀',2,'exact old count');assert.equal(rule.apply('old\r\nold // original'),'$&😀\r\n$&😀 // original');});
test('missing/extra anchors, bounds and omitted required arguments refuse',options,()=>{const rule=countedLiteralSubstitutionRule('language:whole-source','old','new',2,'exact old count');for(const source of ['old','old old old','unchanged'])assert.throws(()=>rule.apply(source),/exact old count/u);for(const count of [0,-1,1.5,4097])assert.throws(()=>countedLiteralSubstitutionRule('id','old','new',count,'message'));assert.throws(()=>countedLiteralSubstitutionRule('id','old','new',1));assert.throws(()=>rule.apply(Buffer.from('old old')));});
