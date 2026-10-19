import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {loadSourceFormatTemplateControl,compileFormatTemplateControlCandidate,executeSourceFormatTemplate,executeSourceFormatArgumentTemplate,originalSourceFormatArgumentTemplate} from '../source-format-template.mjs';
import {captureOriginalFormatExplicitArguments,isOriginalFormatExplicitArguments,originalFormatExplicitArgumentAst} from '../format-explicit-arguments.mjs';
const directory=process.env.ROUTER_FORMAT_EXPLICIT_VECTOR_DIR;
const retain=(name,value)=>{if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value)+'\n');}};
const setup=source=>{const parser=new HostRustParser(tokenizeRust(source));return {source,parser,plan:captureOriginalFormatExplicitArguments(parser,{start:0,end:source.length})};};
const positions=execution=>execution.pieces.filter(piece=>piece.position).map(piece=>piece.position);
const sources=program=>Object.fromEntries(Object.entries(program.sources).map(([name,row])=>[name,row.source]));
test('original parser helper control executes explicit and implicit indexes independently of placeholder order',()=>{
 const program=loadSourceFormatTemplateControl(),execution=executeSourceFormatArgumentTemplate(program,'"{1} {} {0} {} {name} {name}"','{1} {} {0} {} {name} {name}');
 assert.deepEqual(positions(execution),[{tag:'ArgumentIs',args:[1]},{tag:'ArgumentImplicitlyIs',args:[0]},{tag:'ArgumentIs',args:[0]},{tag:'ArgumentImplicitlyIs',args:[1]},{tag:'ArgumentNamed',args:['name']},{tag:'ArgumentNamed',args:['name']}]);
 assert.ok(execution.trace.includes('parser::argument'));assert.ok(execution.trace.includes('parser::position'));assert.ok(execution.trace.includes('parser::integer'));assert.equal(originalSourceFormatArgumentTemplate(execution),execution);
 for(const name of ['argumentAstAssociationVerified','namespaceAuthority','traitSelectionVerified','runtimeParity'])assert.equal(execution[name],false);
 retain('01-original-positional-helper-program',{program,execution});
});
test('position source mutations execute their own changed control and cannot borrow the original execution identity',()=>{
 const original=loadSourceFormatTemplateControl(),input=sources(original),callee=original.functions.find(fn=>fn.name==='parser::argument');assert.ok(callee?.ir);assert.equal(input.parser.slice(callee.span.start,callee.span.end),callee.original);
 const changedCallee=callee.original.replace('ArgumentImplicitlyIs(i)','ArgumentImplicitlyIs(i + 1)');assert.notEqual(changedCallee,callee.original);const changed=input.parser.slice(0,callee.span.start)+changedCallee+input.parser.slice(callee.span.end);
 const program=compileFormatTemplateControlCandidate({...input,parser:changed}),execution=executeSourceFormatArgumentTemplate(program,'"{} {}"','{} {}');
 retain('02-original-and-mutated-position-control',{original,callee,changedCallee,program,execution});
 assert.equal(program.functions.find(fn=>fn.name==='parser::argument').original,changedCallee);assert.ok(execution.trace.includes('parser::argument'));
 assert.deepEqual(positions(execution),[{tag:'ArgumentImplicitlyIs',args:[1]},{tag:'ArgumentImplicitlyIs',args:[2]}]);assert.throws(()=>originalSourceFormatArgumentTemplate(execution),/genuine original/);
});
test('genuine Host expression AST intervals retain nested commas, written argument order and explicit names',()=>{
 const row=setup('format!("{second}{0}{1}", first(1, 2), second = nested(3, other(4, 5)),)'),before=row.parser.cursor.index;
 assert.equal(isOriginalFormatExplicitArguments(row.plan),true);assert.deepEqual(row.plan.sourceOrder,[0,1]);assert.deepEqual(row.plan.arguments.map(arg=>[arg.name,arg.original]),[[null,'first(1, 2)'],['second','nested(3, other(4, 5))']]);
 for(let index=0;index<2;index++){const ast=originalFormatExplicitArgumentAst(row.plan,row.parser,index);assert.equal(ast,row.plan.arguments[index].ast);assert.equal(row.source.slice(ast.span.start,ast.span.end),row.plan.arguments[index].original);}
 assert.equal(row.parser.cursor.index,before);assert.equal(row.plan.constructorControlExecuted,false);assert.equal(row.plan.evaluationOrderVerified,false);assert.equal(row.plan.borrowLifetimeVerified,false);assert.equal(row.plan.noDropAuthority,false);
 retain('03-original-expression-association',row.plan);
});
test('complete original endpoint_base arguments join their full original source without granting macro or borrowing authority',()=>{
 const source=readFileSync(new URL('../../../src/route_contract.rs',import.meta.url),'utf8'),start=source.indexOf('pub fn endpoint_base('),next=source.indexOf('\n#[must_use]',start),body=source.slice(start,next),macroStart=source.indexOf('format!(',start),macroEnd=source.indexOf('\n    )',macroStart)+'\n    )'.length;
 assert.ok(start>=0&&next>start&&macroStart>start&&macroEnd<next);const parser=new HostRustParser(tokenizeRust(source)),before=parser.cursor.index,plan=captureOriginalFormatExplicitArguments(parser,{start:macroStart,end:macroEnd});
 assert.deepEqual(plan.arguments.map(arg=>arg.original),["origin.trim_end_matches('/')",'service_base_path(service)']);
 assert.equal(originalFormatExplicitArgumentAst(plan,parser,0),plan.arguments[0].ast);assert.equal(originalFormatExplicitArgumentAst(plan,parser,1),plan.arguments[1].ast);assert.equal(parser.cursor.index,before);
 for(const name of ['callerMacroOwnerResolved','constructorControlExecuted','evaluationOrderVerified','borrowLifetimeVerified','noDropAuthority','namespaceAuthority','runtimeParity'])assert.equal(plan[name],false);
 const execution=executeSourceFormatArgumentTemplate(loadSourceFormatTemplateControl(),plan.template.text,'{}{}');assert.deepEqual(positions(execution).map(position=>position.args[0]),[0,1]);retain('04-complete-original-endpoint-association',{source,body,plan,execution});
});
test('copied foreign proxy and getter receipts never replay private expression or template associations',()=>{
 const first=setup('format!("{}", value)'),second=setup(first.source),execution=executeSourceFormatArgumentTemplate(loadSourceFormatTemplateControl(),'"{}"','{}');let reads=0;
 const hostile=Object.defineProperty({},'arguments',{get(){reads++;return first.plan.arguments;}});
 for(const fake of [structuredClone(first.plan),{...first.plan},new Proxy(first.plan,{}),hostile]){assert.equal(isOriginalFormatExplicitArguments(fake),false);assert.throws(()=>originalFormatExplicitArgumentAst(fake,first.parser,0),/copied or foreign/);}
 assert.throws(()=>originalFormatExplicitArgumentAst(first.plan,second.parser,0),/copied or foreign/);for(const fake of [structuredClone(execution),{...execution},new Proxy(execution,{})])assert.throws(()=>originalSourceFormatArgumentTemplate(fake),/genuine original/);assert.equal(reads,0);
 retain('05-private-association-replay-boundary',{first:first.plan,second:second.plan,execution,reads});
});
test('fresh original source and parser validation refuses changed tokens modules and expression methods',()=>{
 const changes=[row=>{row.parser.cursor.tokens.find(token=>token.value==='value').value='changed';},row=>{row.parser.modulePath=['foreign'];},row=>{row.parser.expr=()=>({k:'str',value:'forged'});}];
 const failures=[];for(const change of changes){const row=setup('format!("{}", value)');change(row);let failure;assert.throws(()=>{try{originalFormatExplicitArgumentAst(row.plan,row.parser,0);}catch(error){failure={name:error.name,message:error.message};throw error;}});failures.push({plan:row.plan,failure});}retain('06-mutated-original-parser-refusals',failures);
});
test('unsupported syntax argument errors and unproved expression effects retain their independent refusal boundaries',()=>{
 const failures=[];for(const source of ['format!("{x}", x = first(), x = second())','format!("{x}", x = first(), second())','format!("{}",)','format!(concat!("{}"), value)','format!("{}", unsafe {value})']){
  let failure;assert.throws(()=>{try{setup(source);}catch(error){failure={name:error.name,message:error.message};throw error;}});failures.push({source,failure});
 }
 for(const value of ['{0:?}','{0:4}','{name:>3}','{Ω}','{_}','{65536}','{','}'])assert.throws(()=>executeSourceFormatArgumentTemplate(loadSourceFormatTemplateControl(),JSON.stringify(value),value));
 retain('07-independent-unsupported-boundaries',failures);
});
test('new explicit parser does not change any original named capture receipt bytes or literal origins',()=>{
 const program=loadSourceFormatTemplateControl(),raw='"Ω\\u{1f600} {{{block}}}\\n{block}"',value='Ω😀 {{{block}}}\n{block}',before=executeSourceFormatTemplate(program,raw,value),encoded=JSON.stringify(before);
 const explicit=executeSourceFormatArgumentTemplate(program,raw,value),after=executeSourceFormatTemplate(program,raw,value);
 assert.equal(JSON.stringify(after),encoded);assert.deepEqual(explicit.originRanges,before.originRanges);assert.deepEqual(explicit.argPlaces,before.argPlaces);assert.deepEqual(explicit.trace,before.trace);assert.deepEqual(positions(explicit).map(position=>position.args[0]),['block','block']);
 retain('08-complete-old-named-and-new-position-executions',{program,before,explicit,after});
});
