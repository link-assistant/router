// Independent mixed-source expectations; all execution deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceItems} from '../rust-structure.mjs';
import {proposeOpaqueMixedTargetData} from '../opaque-mixed-edits-20261102-target.mjs';
import {proposeOpaqueMixedNativeData} from '../opaque-mixed-edits-20261102-native.mjs';
import {opaqueNumericTargetSpansData,proposeOpaqueNumericNativeCandidateData} from '../opaque-numeric-candidate-data-20261102.mjs';
const limits={timeout:60000};
const native='pub fn oldhelper(value:bool)->bool{value}\npub fn newhelper(value:bool)->bool{!value}\npub fn caller(input:bool)->bool{let local=oldhelper(input);local}\npub fn flag()->bool{true}\n';
const js='export function oldhelper(value){return value;}\nexport function newhelper(value){return !value;}\nexport function caller(input){const local=oldhelper(input);return local;}\nexport function flag(){return true;}\n';
const ts=js.replaceAll('(value)','(value:boolean):boolean').replace('(input)','(input:boolean):boolean').replace('function flag()','function flag():boolean');
const change=source=>source.replace('const local=oldhelper(input);return local;','const renamed=newhelper(input);return renamed;').replace('return true;','return false;');
function capture(){const items=sourceItems(native).filter(row=>row.term==='fn'),owner=items.find(row=>row.name==='flag'),token=owner.tokens.find(row=>row.text==='true');return {javascript:js,typescript:ts,constantIndexOrigins:{cells:[],functions:items.map(row=>({source:'src/lib.rs',qualifiedName:row.name,targetFunction:row.name,span:{start:row.start,end:row.end},parameters:row.name==='flag'?[]:[{name:row.name==='caller'?'input':'value'}],sourceAuthority:false,semanticAuthority:false})),bodyLiterals:[{source:'src/lib.rs',qualifiedName:'flag',targetFunction:'flag',kind:'bool',value:true,before:'true',span:{start:token.start,end:token.end},ownerSpan:{start:owner.start,end:owner.end},sourceAuthority:false,semanticAuthority:false}]},originalSources:new Map([['src/lib.rs',native]]),adoptedSources:new Map([['src/lib.rs',native]])};}
test('both target languages factor all three source edit families without changing other bytes',limits,()=>{
 for(const[language,before]of [['JavaScript',js],['TypeScript',ts]]){const data=proposeOpaqueMixedTargetData(before,change(before),language);assert.deepEqual(data.changedFamilies,['binding','callee','numeric']);assert.equal(data.changedTokens,4);assert.equal(data.groups.numeric.language,language);assert.equal(data.groups.numeric.source,before.replace('return true;','return false;'));assert.equal(data.groups.identifierGroups.binding[0].after,'renamed');assert.equal(data.groups.identifierGroups.callee[0].after,'newhelper');assert.equal(data.sourceAuthority,false);assert.equal(data.semanticAuthority,false);}
});
test('original native candidates combine binding callee and boolean changes as DATA',limits,()=>{
 const groups=proposeOpaqueMixedTargetData(js,change(js),'JavaScript').groups,result=proposeOpaqueMixedNativeData(capture(),groups);
 assert.equal(result.nativeEdits.length,4);assert.equal(result.rustEdits.length,1);assert.equal(result.rustEdits[0].before,native);assert.equal(result.rustEdits[0].after,'pub fn oldhelper(value:bool)->bool{value}\npub fn newhelper(value:bool)->bool{!value}\npub fn caller(input:bool)->bool{let renamed=newhelper(input);renamed}\npub fn flag()->bool{false}\n');assert.deepEqual(result.changedFamilies,['binding','callee','numeric']);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);
});
test('literal-only and identifier-only edits keep their exact original family projections',limits,()=>{
 const numeric=proposeOpaqueMixedTargetData(js,js.replace('return true;','return false;'),'JavaScript'),identifier=proposeOpaqueMixedTargetData(js,js.replaceAll('local','renamed'),'JavaScript');
 assert.equal(numeric.groups.identifierGroups,null);assert.deepEqual(numeric.changedFamilies,['numeric']);assert.equal(identifier.groups.numeric,null);assert.deepEqual(identifier.changedFamilies,['binding']);assert.throws(()=>proposeOpaqueMixedTargetData(js,js,'JavaScript'));
});
test('comments types argument structure and unknown identifiers cannot hide among scalar changes',limits,()=>{
 for(const after of [change(js)+'// modified\n',change(js).replace('newhelper(input);return','newhelper();return'),change(js).replace('const renamed','let renamed'),change(js).replace('newhelper(input);return','unknown(input);return')])assert.throws(()=>proposeOpaqueMixedTargetData(js,after,'JavaScript'));
 assert.throws(()=>proposeOpaqueMixedTargetData(ts,change(ts).replaceAll(':boolean',':number'),'TypeScript'));
});
test('numeric DATA extraction retains old family constraints and rejects unknown request shapes',limits,()=>{
 const rows=opaqueNumericTargetSpansData(js,'JavaScript');assert.ok(rows.some(row=>row.kind==='bool'));assert.ok(rows.every(row=>row.sourceAuthority===false&&row.semanticAuthority===false));
 const result=proposeOpaqueNumericNativeCandidateData(capture(),{language:'JavaScript',source:js.replace('return true;','return false;')});assert.equal(result.nativeEdits.length,1);assert.equal(result.nativeEdits[0].expected,'true');assert.equal(result.nativeEdits[0].replacement,'false');assert.equal(result.semanticAuthority,false);
 assert.throws(()=>proposeOpaqueNumericNativeCandidateData(capture(),{language:'JavaScript',source:js.replace('return true;','return false;'),authority:true}));assert.throws(()=>proposeOpaqueMixedNativeData(capture(),{identifierGroups:null,numeric:null}));
});
