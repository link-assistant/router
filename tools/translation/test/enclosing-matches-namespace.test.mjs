import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {createMatchesMacroContext,createEnclosingMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from '../matches-macro-context.mjs';

const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8');
const deriveDependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
const declaration='pub fn accepted(value:&str)->bool{value.is_empty()}';
const record='#[derive(Clone)]pub struct Record{'+Array.from({length:128},(_,at)=>'f'+at+':u8').join(',')+'}';
function options(source){
 const captured=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE});
 return {modules:captured.views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition})),compilationProfile:PRODUCTION_PROFILE,deriveDependencies};
}
function configured(context,source,text=declaration){
 const parser=new HostRustParser(tokenizeRust(text));
 parser.compilationProfile=PRODUCTION_PROFILE;
 configureMatchesMacroParser(parser,context,{file:'src/lib.rs',offset:source.indexOf(declaration)});
 return parser;
}
test('enclosing matches configuration retains its genuine complete owner proof for borrowed primitive parsing',{timeout:60000},()=>{
 const source=record+declaration,input=options(source);
 const previous=configured(createMatchesMacroContext(input),source);
 assert.equal(previous.builtinShadow('str',[]),true);
 const context=createEnclosingMatchesMacroContext(input),parser=configured(context,source);
 assert.equal(parser.builtinShadow('str',[]),false);
 assert.equal(matchesParserFacts(parser).facts.evidence.scopes[0].unresolvedTypeScope,false);
 parser.visibility();const fn=parser.fn([]);
 assert.equal(fn.name,'accepted');assert.ok(parser.cursor.atEnd());
 assert.equal(context.namespaceAuthority,false);assert.equal(context.runtimeParity,false);
 assert.equal(context.applicationEffectCompleteness,false);
});
test('enclosing matches configuration preserves actual shadowing and unknown sibling obligations',{timeout:60000},()=>{
 for(const source of ['pub struct str;'+record+declaration,record.replace('Clone','Clone,Unknown')+declaration,'unknown!();'+record+declaration,'use missing::*;'+record+declaration]){
  const context=createEnclosingMatchesMacroContext(options(source)),parser=configured(context,source);
  assert.equal(parser.builtinShadow('str',[]),true);
  assert.throws(()=>{parser.visibility();parser.fn([]);},/shadowed borrowed str/);
 }
});
test('enclosing matches configuration rejects copied issuance, changed original slices and mutable namespace replacement',{timeout:60000},()=>{
 const source=record+declaration,context=createEnclosingMatchesMacroContext(options(source));
 assert.throws(()=>configured(structuredClone(context),source),/private original context/);
 assert.throws(()=>configured(context,source,declaration+' '),/source slice/);
 const parser=configured(context,source);matchesParserFacts(parser);
 parser.sourceNamespaceAliases.type.get('').set('str',['crate','Forged']);
 assert.throws(()=>matchesParserFacts(parser),/association/);
});
