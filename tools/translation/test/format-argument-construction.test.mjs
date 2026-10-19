import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {loadPinnedFormatSourceStages} from '../format-source-profiles.mjs';
import {loadFormatRegisteredInputs} from '../format-registered-inputs.mjs';
import {loadFormatConstructorInputs,formatConstructorInputSource} from '../format-constructor-inputs.mjs';
import {captureOriginalFormatExplicitArguments} from '../format-explicit-arguments.mjs';
import {compileOriginalFormatArgumentConstruction,originalFormatArgumentConstructionFacts,associateOriginalFormatArgumentConstruction,originalFormatArgumentConstructionAssociation,compileFormatArgumentControlCandidate,executeFormatArgumentControlCandidate} from '../format-argument-construction.mjs';
const test=(name,body)=>nodeTest(name,{timeout:5000},body),directory=process.env.ROUTER_FORMAT_CONSTRUCTION_VECTOR_DIR;
const retain=(name,value)=>{if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value)+'\n');}};
const hash=value=>createHash('sha256').update(value).digest('hex');
const flags=['originalCompilerControlExecuted','parseArgsControlExecuted','argumentAddControlExecuted','evaluationOrderVerified','expressionEffectsClosed','borrowLifetimeVerified','noDropAuthority','callerMacroOwnerResolved','namespaceAuthority','runtimeAuthority','runtimeParity'];
const denied=value=>{for(const flag of flags)assert.equal(value[flag],false,flag);};
function setup(){const proof=loadPinnedFormatSourceStages(),inputs=loadFormatRegisteredInputs(proof),constructor=loadFormatConstructorInputs(inputs,proof),program=compileOriginalFormatArgumentConstruction(constructor,inputs,proof);return {proof,inputs,constructor,program};}
function caller(source){const parser=new HostRustParser(tokenizeRust(source)),plan=captureOriginalFormatExplicitArguments(parser,{start:0,end:source.length});return {source,parser,plan};}
const authored={
 push_once:"fn push_once<'a>(out: &mut Vec<&'a str>, value: &'a str) { out.push(value); }",
 construct:"fn construct<'a>(mut args: Vec<&'a str>, first: &'a str, second: &'a str) -> Vec<&'a str> { push_once(&mut args, first); push_once(&mut args, second); args }",
};
test('complete original constructor parser and lowering declarations retain exact source and unresolved controls',()=>{
 const row=setup(),facts=originalFormatArgumentConstructionFacts(row.program);assert.equal(facts.helpers.length,12);assert.equal(facts.sources.length,3);denied(row.program);
 for(const helper of facts.helpers){const origin=facts.sources.find(source=>source.path===helper.sourcePath);assert.equal(origin.source.slice(helper.span.start,helper.span.end),helper.original);assert.equal(origin.source.slice(helper.bodySpan.start,helper.bodySpan.end),helper.body);assert.equal(hash(helper.original),helper.sha256);assert.equal(hash(helper.body),helper.bodySha256);assert.equal(helper.control.source,helper.body);if(!helper.control.controlSyntaxProjected)assert.ok(helper.control.diagnostics.length);}
 const add=facts.helpers.find(helper=>helper.name==='add');assert.match(add.original,/matches!/);assert.match(add.original,/assert_eq!/);assert.match(add.original,/self\.arguments\.push\(arg\)/);const parse=facts.helpers.find(helper=>helper.name==='parse_args');assert.match(parse.original,/exp!\(Comma\)/);assert.match(parse.original,/FormatDuplicateArg/);assert.match(parse.original,/PositionalAfterNamed/);assert.ok(facts.unresolvedControls.length);retain('01-full-original-construction-controls',row.program);
});
test('private complete source accessor refuses copied foreign proxy and hostile constructor identities before callbacks',()=>{
 const row=setup(),path='compiler/rustc_ast/src/format.rs',source=formatConstructorInputSource(row.constructor,row.inputs,row.proof,path);assert.ok(Object.isFrozen(source));assert.match(source.source,/impl FormatArguments/);let reads=0;const hostile=Object.defineProperty({},'sources',{get(){reads++;return row.program.sources;}});
 for(const fake of [structuredClone(row.constructor),{...row.constructor},new Proxy(row.constructor,{}),hostile])assert.throws(()=>formatConstructorInputSource(fake,row.inputs,row.proof,path),/copied or foreign/);
 assert.throws(()=>formatConstructorInputSource(row.constructor,row.inputs,loadPinnedFormatSourceStages(),path),/copied or foreign/);for(const fake of [structuredClone(row.program),new Proxy(row.program,{}),hostile])assert.throws(()=>originalFormatArgumentConstructionFacts(fake),/copied or foreign/);assert.equal(reads,0);retain('02-private-source-association-refusals',{source,reads});
});
test('original explicit AST associations preserve written order despite repeated reordered placeholders',()=>{
 const row=setup(),input=caller('format!("{second} {0} {second}", first(1, nested(2, 3)), second = last(4))'),before=input.parser.cursor.index,association=associateOriginalFormatArgumentConstruction(row.program,input.plan,input.parser);
 assert.deepEqual(association.writtenArgumentOrder,[0,1]);assert.deepEqual(association.arguments.map(arg=>arg.original),['first(1, nested(2, 3))','last(4)']);for(let index=0;index<2;index++)assert.equal(association.arguments[index].ast,input.plan.arguments[index].ast);assert.equal(input.parser.cursor.index,before);assert.equal(originalFormatArgumentConstructionAssociation(association,row.program,input.parser),association);assert.equal(association.callerAstAssociationVerified,true);denied(association);retain('03-private-written-order-not-execution',{source:input.source,association});
});
test('complete original endpoint arguments and full lowering retain borrowed tuple and single argument branches',()=>{
 const row=setup(),source=readFileSync(new URL('../../../src/route_contract.rs',import.meta.url),'utf8'),start=source.indexOf('pub fn endpoint_base('),macroStart=source.indexOf('format!(',start),macroEnd=source.indexOf('\n    )',macroStart)+'\n    )'.length,parser=new HostRustParser(tokenizeRust(source)),plan=captureOriginalFormatExplicitArguments(parser,{start:macroStart,end:macroEnd}),association=associateOriginalFormatArgumentConstruction(row.program,plan,parser);
 assert.deepEqual(association.arguments.map(arg=>arg.original),["origin.trim_end_matches('/')",'service_base_path(service)']);const lower=association.lowering.find(helper=>helper.name==='expand_format_args');assert.match(lower.original,/arguments\.len\(\) == 1/);assert.match(lower.original,/hir::ExprKind::Tup\(elements\)/);assert.match(lower.original,/stmt_super_let_pat/);assert.match(lower.original,/hir::BorrowKind::Ref/);denied(association);retain('04-original-endpoint-complete-lowering',{source,association});
});
test('copied cross analysis and freshly mutated caller frames cannot replay construction associations',()=>{
 const row=setup(),a=caller('format!("{}", value)'),b=caller(a.source),association=associateOriginalFormatArgumentConstruction(row.program,a.plan,a.parser);let reads=0;const hostile=Object.defineProperty({},'arguments',{get(){reads++;return association.arguments;}});
 for(const fake of [structuredClone(association),{...association},new Proxy(association,{}),hostile])assert.throws(()=>originalFormatArgumentConstructionAssociation(fake,row.program,a.parser),/copied or foreign/);
 assert.throws(()=>originalFormatArgumentConstructionAssociation(association,setup().program,a.parser),/copied or foreign/);assert.throws(()=>originalFormatArgumentConstructionAssociation(association,row.program,b.parser),/copied or foreign/);a.parser.cursor.tokens.find(token=>token.value==='value').value='changed';assert.throws(()=>originalFormatArgumentConstructionAssociation(association,row.program,a.parser));assert.equal(reads,0);retain('05-origin-and-mutable-caller-refusals',{association,reads});
});
test('whole authored source control executes each helper invocation in original statement order without runtime authority',()=>{
 const program=compileFormatArgumentControlCandidate(authored),result=executeFormatArgumentControlCandidate(program,'construct',[[],'first','second']);assert.deepEqual(result.execution.result,['first','second']);assert.deepEqual(result.execution.trace,['construct','push_once','push_once']);assert.equal(result.authoredControlExecuted,true);denied(result);denied(program);retain('06-whole-authored-control-execution',{authored,program,result});
});
test('executed changed helper body changes the authored result and forged controls never acquire execution',()=>{
 const changed={...authored,construct:authored.construct.replace('push_once(&mut args, first); push_once(&mut args, second);','push_once(&mut args, second); push_once(&mut args, first);')};assert.notEqual(changed.construct,authored.construct);const original=compileFormatArgumentControlCandidate(authored),mutated=compileFormatArgumentControlCandidate(changed),before=executeFormatArgumentControlCandidate(original,'construct',[[],'first','second']),after=executeFormatArgumentControlCandidate(mutated,'construct',[[],'first','second']);assert.deepEqual(before.execution.result,['first','second']);assert.deepEqual(after.execution.result,['second','first']);for(const fake of [structuredClone(original),{...original},new Proxy(original,{})])assert.throws(()=>executeFormatArgumentControlCandidate(fake,'construct',[[],'first','second']),/copied or foreign/);denied(after);retain('07-actual-authored-body-mutation',{authored,changed,original,mutated,before,after});
});
test('unresolved original macros and candidate getter proxy sparse cyclic values remain refused',()=>{
 const original=setup(),add=original.program.helpers.find(helper=>helper.name==='add'),candidate=compileFormatArgumentControlCandidate({add:add.original});assert.throws(()=>executeFormatArgumentControlCandidate(candidate,'add',[[],0]));const program=compileFormatArgumentControlCandidate(authored);let reads=0;const getter=[];Object.defineProperty(getter,'0',{get(){reads++;return 'foreign';},enumerable:true});const sparse=new Array(1),cycle=[];cycle.push(cycle);
 for(const args of [[getter,'a','b'],[new Proxy([],{}),'a','b'],[sparse,'a','b'],[cycle,'a','b']])assert.throws(()=>executeFormatArgumentControlCandidate(program,'construct',args));assert.equal(reads,0);assert.throws(()=>executeFormatArgumentControlCandidate(original.program,'construct',[[],'a','b']),/copied or foreign/);denied(original.program);retain('08-complete-unresolved-frontiers-and-value-refusals',{program,original:original.program,reads});
});
test('same-key-count candidate holes cannot read inherited numeric descriptor getters',()=>{
 const program=compileFormatArgumentControlCandidate(authored),hole=new Array(1);hole.unrelated='same key count';const args=[hole,'first','second'];let reads=0;const previous=Object.getOwnPropertyDescriptor(Object.prototype,'0');
 try{Object.defineProperty(Object.prototype,'0',{configurable:true,get(){reads++;return {value:'foreign',enumerable:true};}});assert.throws(()=>executeFormatArgumentControlCandidate(program,'construct',args),/^TypeError: Original format argument construction: candidate dense own values required$/);}
 finally{if(previous)Object.defineProperty(Object.prototype,'0',previous);else delete Object.prototype[0];}
 assert.equal(reads,0);denied(program);retain('09-inherited-descriptor-own-hole-boundary',{authored,program,reads,rejectedAt:'candidate-own-index-descriptor',holeLength:hole.length,ownKeys:Reflect.ownKeys(hole)});
});
