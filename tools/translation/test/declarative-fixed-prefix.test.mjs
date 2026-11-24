import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput,declarativeExpansionLineage} from '../declarative-token-macros.mjs';
import {originalMacroTrees,originalMacroTreeText} from '../macro-token-trees.mjs';
import {originalMacroSequenceFollowRule,assertOriginalMacroSequenceFollowRule} from '../macro-follow-source.mjs';
const test=(name,body)=>nodeTest(name,{timeout:5000},body),options={name:'sample',owner:['arbitrary_source']};
const output=proof=>proof.trees.map(originalMacroTreeText).join(' ');
function retain(name,value){const directory=process.env.ROUTER_ASYNC_CONTROL_VECTORS;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}}
function check(source,input){const definition=compileDeclarativeMacro(source,options),trees=originalMacroTrees(input),proof=expandDeclarativeMacro(definition,trees);assert.equal(declarativeExpansionLineage(proof).definition,definition);assert.equal(proof.ownerVerified,false);assert.equal(proof.generatedBehavior,false);assert.equal(proof.namespaceComplete,false);return {source,input,definition,proof};}
test('distinct required group terminals separate adjacent repetitions after a shared literal prefix',()=>{
 const source='macro_rules! sample { ($(#[left $a:tt])* $(#[right $b:tt])* $tail:ident) => {($($a)*;$($b)*;$tail)}; }',rows=[];
 for(const [input,expected]of [['#[left a]#[left b]#[right c]Done','(a b ; c ; Done)'],['#[right c]Done','(; c ; Done)'],['Done','(; ; Done)']]){const row=check(source,input);assert.equal(output(row.proof),expected);rows.push(row);}retain('fixed-prefix-distinct-groups',rows);
});
test('required group terminals also separate a repeated prefix from its fixed suffix without token backtracking',()=>{
 const source='macro_rules! sample { ($(wrap [left $a:tt])* wrap [right $b:tt]) => {($($a)*;$b)}; }',rows=[];
 for(const input of ['wrap [left a]wrap [right b]','wrap [right b]'])rows.push(check(source,input));assert.equal(output(rows[0].proof),'(a ; b)');assert.equal(output(rows[1].proof),'(; b)');const equalGroups=check('macro_rules! sample { ($(prefix [fixed] left $a:tt)* prefix [fixed] right $b:tt) => {($($a)*;$b)}; }','prefix [fixed] left a prefix [fixed] right b');assert.equal(output(equalGroups.proof),'(a ; b)');retain('fixed-prefix-required-suffix',{rows,equalGroups});
});
test('nullable exits retain all following fixed prefixes and the original compiler FOLLOW source',()=>{
 const source='macro_rules! sample { ($(#[first $a:tt])* $(#[second $b:tt])* #[last $c:tt]) => {($($a)*;$($b)*;$c)}; }',rows=[];
 for(const input of ['#[first a]#[second b]#[last c]','#[second b]#[last c]','#[first a]#[last c]','#[last c]'])rows.push(check(source,input));const rule=originalMacroSequenceFollowRule();assert.equal(assertOriginalMacroSequenceFollowRule(rule),rule);assert.equal(rule.includeOwnFirst,false);assert.equal(rule.includeSeparator,true);retain('fixed-prefix-nullable-follow',{rule,rows});
});
test('capture overlaps identical tags and capture-before-difference remain ambiguous and refused',()=>{
 const cases=[['$($a:ident)* $b:ident','name'],['$($a:tt)* $b:tt','name'],['$(#[same $a:tt])* #[same $b:tt]','#[same name]'],['$(#[$a:ident])* #[$b:ident]','#[name]'],['$(prefix $a:ident)* prefix end','prefix end'],['$(#[tag $a:ident left])* #[tag $b:ident right]','#[tag name right]'],['$(($a:ident) left)* ($b:ident) right','(name) right'],['$(($($a:ident)*) left)* ($($b:ident)*) right','(name) right']];
 for(const [pattern,input]of cases){const source='macro_rules! sample { ('+pattern+') => {true}; }',definition=compileDeclarativeMacro(source,options);assert.throws(()=>expandDeclarativeMacro(definition,originalMacroTrees(input)),/ambiguous/);}retain('fixed-prefix-ambiguous-negatives',cases);
});
test('opaque forwarded metadata remains opaque across distinct fixed group tags',()=>{
 const parentDefinition=compileDeclarativeMacro('macro_rules! sample { ($m:meta) => { (#[left $m] Done) }; }',options),parent=expandDeclarativeMacro(parentDefinition,originalMacroTrees('feature = "original"')),input=declarativeSubInput(parent,[0]),source='macro_rules! sample { ($(#[left $a:meta])* $(#[right $b:meta])* $tail:ident) => {($($a)*;$($b)*;$tail)}; }',definition=compileDeclarativeMacro(source,options),proof=expandDeclarativeMacro(definition,input);assert.equal(declarativeExpansionLineage(proof).parent,parent);const captured=proof.trees[0].children[0];assert.equal(captured.kind,'fragment');assert.equal(captured.fragment,'meta');assert.equal(captured.trees[0].kind,'fragment');assert.equal(captured.trees[0].fragment,'meta');const inspect=compileDeclarativeMacro('macro_rules! sample { (feature = "original" ; ; Done) => {true}; }',options);assert.throws(()=>expandDeclarativeMacro(inspect,declarativeSubInput(proof,[0])),/does not match/);retain('fixed-prefix-opaque-forwarding',{source,parent,definition,proof});
});
test('fixed-prefix refinement preserves private definition/input brands and original expansion budgets',()=>{
 const source='macro_rules! sample { ($(#[left $a:tt])* $(#[right $b:tt])* $tail:ident) => {($($a)*;$($b)*;$tail)}; }',definition=compileDeclarativeMacro(source,options),input=originalMacroTrees('#[left a]#[right b]Done');for(const fake of [structuredClone(definition),{...definition},new Proxy(definition,{})])assert.throws(()=>expandDeclarativeMacro(fake,input),/sealed definition/);assert.throws(()=>expandDeclarativeMacro(definition,structuredClone(input)),/original or privately forwarded/);assert.throws(()=>expandDeclarativeMacro(definition,input,{steps:1}),/budget/);assert.throws(()=>expandDeclarativeMacro(definition,input,{output:1}),/budget/);retain('fixed-prefix-private-budget-guards',{source,definition,input});
});
