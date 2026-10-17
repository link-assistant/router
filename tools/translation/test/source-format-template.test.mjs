import originalTest from 'node:test';
import originalAssert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {loadSourceFormatTemplateControl,compileFormatTemplateControlCandidate,executeSourceFormatTemplate,checkedSourceFormatPieces,executeSourceFormatConstructorTemplate,isSourceFormatTemplateControl} from '../source-format-template.mjs';
import {loadPinnedFormatSourceStages} from '../format-source-profiles.mjs';
import {loadFormatRegisteredInputs,expandRegisteredFormatWrapper} from '../format-registered-inputs.mjs';
import {loadFormatConstructorInputs,sourceLiteralFormatConstructorCandidate} from '../format-constructor-inputs.mjs';
import {translateSource} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const vectorDirectory=process.env.ROUTER_FORMAT_VECTOR_DIR;let observations=[];
const encode=value=>JSON.stringify(value,(_,item)=>typeof item==='bigint'?{$integer:item.toString()}:item instanceof RegExp?{$regex:item.source,flags:item.flags}:item);
const observe=(kind,value)=>{if(vectorDirectory)observations.push({kind,value});};
const assert=new Proxy(originalAssert,{get(target,key){const original=target[key];if(typeof original!=='function')return original;return (...args)=>{
 if(key==='throws'){let failure;const [call,...rest]=args,result=original(()=>{try{return call();}catch(error){failure={name:error.name,message:error.message,...(error.code?{code:error.code}:{})};throw error;}},...rest);observe('assert-throws',{failure,expected:rest});return result;}
 const result=original(...args);observe('assert-'+String(key),args);return result;
};}});
const test=(name,run)=>originalTest(name,{},async()=>{observations=[];await run();if(vectorDirectory){mkdirSync(vectorDirectory,{recursive:true});writeFileSync(join(vectorDirectory,Buffer.from(name).toString('hex')+'.json'),encode({name,observations})+'\n');}});
async function verifyObservedTargets(label,result,verify){
 const before=new Set(vectorDirectory?readdirSync(tmpdir()).filter(name=>name.startsWith('router-typed-targets-')):[]);let captured=false;
 observe('production-'+label,result);
 await verifyTypedTargets(result,(api,...rest)=>{
  if(vectorDirectory&&!captured){const created=readdirSync(tmpdir()).filter(name=>name.startsWith('router-typed-targets-')&&!before.has(name));originalAssert.equal(created.length,1);const directory=join(tmpdir(),created[0]),entry=result.meta?.entry===undefined?'src/module':result.meta.entry.slice(0,-3);observe('typed-artifacts-'+label,{javascript:readFileSync(join(directory,entry+'.mjs'),'utf8'),typescript:readFileSync(join(directory,entry+'.ts'),'utf8'),compiledTypeScript:readFileSync(join(directory,'compiled',entry+'.js'),'utf8')});captured=true;}
  return verify(api,...rest);
 });
}
const sources=program=>Object.fromEntries(Object.entries(program.sources).map(([name,row])=>[name,row.source]));
const captures=execution=>execution.pieces.filter(piece=>piece.captureName).map(piece=>piece.captureName);
function provenance(node){if(node?.formatProvenance)return node.formatProvenance;if(!node||typeof node!=='object')return;for(const value of Object.values(node)){const result=Array.isArray(value)?value.map(provenance).find(Boolean):provenance(value);if(result)return result;}}
test('original parser control executes named captures, repetitions, doubled braces and literal segments',()=>{
 const program=loadSourceFormatTemplateControl();observe('complete-original-control-program',program);assert.equal(loadSourceFormatTemplateControl(),program);assert.equal(isSourceFormatTemplateControl(program),true);
 const execution=executeSourceFormatTemplate(program,'"{{{block}}}\\n{block}"','{{{block}}}\n{block}');observe('literal-capture-ir',execution);
 assert.deepEqual(captures(execution),['block','block']);assert.deepEqual(execution.pieces.map(piece=>piece.text??'<'+piece.captureName+'>'),['{','<block>','}\n','<block>']);
 for(const helper of ['parser::new','parser::next','parser::argument','parser::position','parser::word','parser::peek','parser::consume_pos','parser::string','escaper::unescape_unicode','lexer::is_id_start','xid::is_xid_start'])assert.ok(execution.trace.includes(helper),helper);
 assert.equal(execution.namespaceAuthority,false);assert.equal(execution.traitSelectionVerified,false);assert.equal(execution.runtimeParity,false);
});
test('actual literal escaper and Parser::new preserve cooked UTF8 origins and raw literal offsets',()=>{
 const program=loadSourceFormatTemplateControl(),raw='"Ω\\u{1f600} \\x7bblock\\x7d\\n"',decoded='Ω😀 {block}\n',execution=executeSourceFormatTemplate(program,raw,decoded);
 observe('cooked-literal-capture-ir',execution);assert.deepEqual(captures(execution),['block']);assert.ok(execution.trace.includes('escaper::scan_unicode'));assert.ok(execution.trace.includes('escaper::scan_escape'));
 const capture=execution.pieces.find(piece=>piece.captureName);assert.equal(Buffer.from(raw).subarray(capture.positionSpan.start,capture.positionSpan.end).toString(),'block');assert.equal(Buffer.from(raw).subarray(capture.placeholderSpan.start,capture.placeholderSpan.end).toString(),'\\x7bblock\\x7d');
 const pieces=checkedSourceFormatPieces(execution,name=>[name],{start:20}),piece=pieces.find(piece=>piece.capture);assert.equal(raw.slice(piece.sourcePosition.span.start-20,piece.sourcePosition.span.end-20),'block');
 const rawExecution=executeSourceFormatTemplate(program,'r##"Ω {block}"##','Ω {block}');assert.deepEqual(captures(rawExecution),['block']);assert.equal(rawExecution.pieces.find(piece=>piece.captureName).positionSpan.start,8);
});
test('source literal constructor identity feeds the executable template stage without caller binding',()=>{
 const program=loadSourceFormatTemplateControl(),proof=loadPinnedFormatSourceStages(),inputs=loadFormatRegisteredInputs(proof),plan=loadFormatConstructorInputs(inputs,proof),stage=expandRegisteredFormatWrapper(inputs,proof,'format','format!("{block}\\n\\n")'),candidate=sourceLiteralFormatConstructorCandidate(plan,inputs,proof,stage);
 observe('complete-source-constructor-helper-selection',{proof,inputs,plan,stage,candidate});assert.deepEqual(captures(executeSourceFormatConstructorTemplate(program,candidate,'{block}\n\n')),['block']);assert.throws(()=>executeSourceFormatConstructorTemplate(program,structuredClone(candidate),'{block}\n\n'),/copied or forged/);
});
test('source helper mutations change executed control and never borrow production authority',()=>{
 const program=loadSourceFormatTemplateControl(),original=sources(program);
 const renamed=compileFormatTemplateControlCandidate({...original,parser:original.parser.replace('Some(ArgumentNamed(word))\n','Some(ArgumentNamed("renamed"))\n')});
 observe('mutated-control-program-parser',renamed);const changed=executeSourceFormatTemplate(renamed,'"{block}"','{block}');assert.deepEqual(captures(changed),['renamed']);assert.throws(()=>checkedSourceFormatPieces(changed,name=>[name],{start:0}),/genuine executed original/);
 const escaped=compileFormatTemplateControlCandidate({...original,escaper:original.escaper.replace("'n' => '\\n'","'n' => 'X'")});assert.throws(()=>executeSourceFormatTemplate(escaped,'"a\\nb"','a\nb'),/decode differs/);assert.equal(executeSourceFormatTemplate(escaped,'"a\\nb"','aXb').value,'aXb');
 observe('mutated-control-program-escaper',escaped);const xid=compileFormatTemplateControlCandidate({...original,xid:original.xid.replace("('a' <= self && self <= 'z')","('c' <= self && self <= 'z')")});assert.throws(()=>executeSourceFormatTemplate(xid,'"{block}"','{block}'),/unresolved|original parser|ASCII/);
 observe('mutated-control-program-xid',xid);const missing=compileFormatTemplateControlCandidate({...original,lexer:original.lexer.replace('unicode_xid::UnicodeXID::is_xid_start(c)','unknown_helper(c)')});assert.throws(()=>executeSourceFormatTemplate(missing,'"{block}"','{block}'),/unresolved original path unknown_helper/);observe('mutated-control-program-unresolved-helper',missing);
});
test('copied/forged/proxy/getter programs and output receipts cannot be used as executable proofs',()=>{
 const program=loadSourceFormatTemplateControl(),execution=executeSourceFormatTemplate(program,'"{block}"','{block}');let reads=0;
 const hostile=Object.defineProperty({},'schema',{get(){reads++;return program.schema;}});
 for(const fake of [structuredClone(program),{...program},new Proxy(program,{}),hostile]){assert.equal(isSourceFormatTemplateControl(fake),false);assert.throws(()=>executeSourceFormatTemplate(fake,'"{block}"','{block}'),/copied or forged/);}
 for(const fake of [structuredClone(execution),{...execution},new Proxy(execution,{})])assert.throws(()=>checkedSourceFormatPieces(fake,name=>[name],{start:0}),/genuine executed original/);assert.equal(reads,0);
});
test('unsupported template syntax, explicit indexes, nonASCII names and invalid escapes stay outside the source route',()=>{
 const program=loadSourceFormatTemplateControl();
 for(const value of ['{}','{0}','{block:?}','{block:}','{block:4}','{block.width}','{_}','{Ω}','{r#block}','{block','}'])assert.throws(()=>executeSourceFormatTemplate(program,JSON.stringify(value),value));
 for(const raw of ['"\\z"','"\\xFF"','"\\u{d800}"','"\\u{110000}"'])assert.throws(()=>executeSourceFormatTemplate(program,raw,''));
 assert.throws(()=>executeSourceFormatTemplate(program,'"a\\\n b"','ab'),/unresolved original helper|unresolved primitive helper/);
 assert.throws(()=>executeSourceFormatTemplate(program,'"{block}"','changed'),/decode differs/);
});
test('production routerFormat consumer executes source pieces and retains checked caller shadowing',async()=>{
 const original='pub fn print(block:&str)->String{format!("Ω {{{block}}}\\n{block}")}',result=translateSource(original),item=result.ir.items.find(item=>item.name==='print');assert.equal(item.status,'executable');
 const proof=provenance(item.semantic.checkedIR);assert.ok(proof.sourceControl);assert.ok(proof.sourceControl.helperTrace.includes('parser::word'));assert.equal(proof.sourceControl.namespaceAuthority,false);
 await verifyObservedTargets('standalone',result,api=>assert.equal(api.print('caller'),'Ω {caller}\ncaller'));
 const files={'src/lib.rs':'mod config; use crate::config::label as block; pub fn print(block:&str)->String{format!("{block}")}','src/config.rs':'pub fn label()->u8{7}'};
 const project=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.deepEqual(project.meta.refused,[]);await verifyObservedTargets('project',project,api=>assert.equal(api.print('lexical'),'lexical'));
});
test('production consumer retains source macro ownership, unresolved caller and serde Value refusals',()=>{
 for(const source of ['macro_rules! format{($($tt:tt)*)=>{"custom"}} pub fn bad(block:&str)->String{format!("{block}")}','use custom::format; pub fn bad(block:&str)->String{format!("{block}")}','pub fn bad()->String{format!("{missing}")}','pub fn bad(event:serde_json::Value)->String{format!("{event}")}']){const result=translateSource(source);observe('negative-production-input-and-output',{source,result});assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);}
});
