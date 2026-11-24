import test from 'node:test';
import assert from 'node:assert/strict';
import {createRulePipeline,exactSubstitutionRule} from '../rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from '../literal-substitution-rule.mjs';
const cases=['$&',"$'",'$`','$$','$1','$<named>','$$&$`$\'','$&\n\u0000\ud800😀',''];

test('literal source replacements retain every dollar form Unicode unit and surrounding byte',()=>{
 for(const value of cases){const rule=exactLiteralSubstitutionRule('literal','ANCHOR',value,'original literal drift');assert.equal(rule.apply('prefix ANCHOR suffix'),'prefix '+value+' suffix');assert.equal(rule.apply('ANCHOR'),value);}
 assert.equal(exactSubstitutionRule('original','abc','$&!','drift').apply('abc'),'abc!');
});

test('both extensible sequences preserve complete literal payloads in declaration order',()=>{
 for(const value of cases){const pipeline=createRulePipeline([{phase:'language',rules:[exactLiteralSubstitutionRule('language:literal','ROOT','BEGIN '+value+' END','language drift')]},{phase:'repository',rules:[exactLiteralSubstitutionRule('repository:literal','END','DONE $&','repository drift')]}]),result=pipeline.run('ROOT');assert.equal(result.value,'BEGIN '+value+' DONE $&');assert.deepEqual(result.trace,[{phase:'language',id:'language:literal'},{phase:'repository',id:'repository:literal'}]);}
});

test('literal replacements retain exact missing duplicate and argument refusals',()=>{
 const rule=exactLiteralSubstitutionRule('literal','ANCHOR','$&','original literal drift');for(const value of ['absent','ANCHOR ANCHOR'])assert.throws(()=>rule.apply(value),error=>error.constructor===Error&&error.message==='original literal drift');
 for(const args of [['id','', 'after','message'],['id',null,'after','message'],['id','before',null,'message'],['id','before','after',null]]){let original;try{exactSubstitutionRule(...args);}catch(error){original=error;}assert.ok(original);assert.throws(()=>exactLiteralSubstitutionRule(...args),error=>error.constructor===original.constructor&&error.message===original.message);}
});

test('the original argument refusal precedes replacement quoting',()=>{
 const original=String.prototype.split;let calls=0,caught;
 try{String.prototype.split=function(...args){calls++;return original.apply(this,args);};try{exactLiteralSubstitutionRule('literal','','$&','drift');}catch(error){caught=error;}}
 finally{String.prototype.split=original;}
 assert.equal(calls,0);assert.ok(caught instanceof TypeError);assert.match(caught.message,/nonempty text anchors/);
});
