// A separate owned unit-enum operation. Old literal matches and their birth
// equations are unchanged; private source association supplies const custody.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PROFILE=new URL('./source-profiles/core-unit-matches/',import.meta.url);
const FACADE='rust/src/translation_core.rs',DATA='tools/translation/router-core-source-data.mjs',MATCHES='tools/translation/router-core-matches.mjs',CONST='tools/translation/extensions/const-match-source-context.mjs',ORDERED='tools/translation/extensions/ordered-matches.mjs',LAYOUT='tools/translation/extensions/unit-enum-cast.mjs',LINKS='tools/translation/extensions/source-links.mjs',ORACLE='rust/tests/translation_core_unit_matches_oracle.rs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Owned unit matches source preparation: '+message);};
const once=(source,before,after)=>{if(source.split(before).length!==2)fail('one complete original source anchor required: '+before);return source.replace(before,()=>after);};
function originals(){
 const packed=readFileSync(new URL('originals.json.gz',PROFILE));if(packed.length!==21351||hash(packed)!=='6efce2846b89e62bfa110fcf64515ffa3e01c166c72c9bcc6d77d98b08354588')fail('original archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:100000});if(raw.length!==79042||hash(raw)!=='297e09a73f916dcff234be60e710fb3e4b2301aed84ecc55a7d0abb1e9b4ab21')fail('complete original programs differ');
 const packet=JSON.parse(raw.toString('utf8'));if(packet.files.length!==8||new Set(packet.files.map(row=>row.path)).size!==8)fail('complete original source census differs');for(const row of packet.files)if(hash(row.source)!==row.sha256)fail('complete original source hash differs');return packet;
}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function shape(ts,node){const children=[];ts.forEachChild(node,child=>{children.push(shape(ts,child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];}
function copy(ts,node){const result=ts.getSynthesizedDeepClone(node),detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};detach(result);return result;}
function nativeCopy(ts,path,source){const file=parse(ts,path,source),copied=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,file.statements.map(node=>copy(ts,node))));if(JSON.stringify(shape(ts,parse(ts,path,copied)))!==JSON.stringify(shape(ts,file)))fail('complete detached native AST copy differs');return {source,copy:copied,completeNativeAstCopy:true};}
function named(ts,file,name){const rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);if(rows.length!==1||!rows[0].body)fail('one complete native function required: '+name);return rows[0];}
const UNIT_BRANCH=`
      if (unit) {
        let cells = 0;
        const pattern = value => {
          if (++cells > ORDERED_MATCH_PROFILE.alternativeLimit) fail('unit alternative bound exceeded', value.span);
          if (value.k === 'or') { for (const child of value.alternatives) pattern(child); return; }
          if (value.k !== 'ctor' || !Array.isArray(value.args) || value.args.length) fail('requires unguarded unit constructors without bindings', value.span);
        };
        pattern(node.rows[0].pattern);
        node.sourceMacro = {name:'matches_unit',owner:'owned-router-unit-source',profile:ORDERED_MATCH_PROFILE.id,span:node.span,
          compatibilityCore:{id:'router-core-unit-matches-v1',symbol:'crate::translation_core::matches_unit',
            facadeSha256:ROUTER_FORMATTING_FACADE_SHA256,libraryImplementation:'untranslated-rust-std-matches',
            domain:'original-checked-Copy-no-Drop-unit-enums-without-guards-or-bindings'}};
        return {...node,constEligible:false};
      }
`;
const RECEIPT=`
// These records retain original parse custody, never a source/owner verdict,
// digest or encoded payload. The checker reissues its own scope on each run.
const ownedUnitMatchesParses=new WeakMap();
export function originalOwnedUnitMatchesSource(entry,node){
  const origin=originalParsedSyntaxNode(entry,node),receipt=origin&&ownedUnitMatchesParses.get(origin.original);
  if(!receipt||origin.actual!==node||origin.parser!==receipt.parser)return false;
  try { const proof=requireRouterCoreFacade(receipt.parser);requireRouterCoreFacadeCurrent(receipt.parser,proof); }
  catch(error){if(error instanceof TypeError)return false;throw error;}
  return true;
}
`;
const RUST_ORACLE=`//! Independent native unit-enum matches oracle. CI only after the JavaScript gate.
use link_assistant_router::translation_core;

#[derive(Clone, Copy)]
enum Mode {
    First,
    Second,
    Third,
}

const fn selected(mode: Mode) -> bool {
    translation_core::matches_unit!(mode, Mode::First | Mode::Third)
}

const FIRST: bool = selected(Mode::First);
const SECOND: bool = selected(Mode::Second);

#[test]
fn unit_variants_const_and_single_subject_evaluation() {
    assert!(FIRST);
    assert!(!SECOND);
    assert!(selected(Mode::Third));
    let mut calls = 0;
    assert!(translation_core::matches_unit!(
        {
            calls += 1;
            Mode::Third
        },
        Mode::First | Mode::Third
    ));
    assert_eq!(calls, 1);
}
`;
function equations(ts,packet){
 const source=Object.fromEntries(packet.files.map(row=>[row.path,row.source])),after={...source};
 after[FACADE]=source[FACADE]+'\n/// Test checked Copy/no-Drop unit-enum constructors; library internals stay native.\npub use crate::__router_translation_core_matches as matches_unit;\n';
 for(const suffix of ['SOURCE','SHA256']){const value=text=>suffix==='SOURCE'?text:hash(text);after[DATA]=once(after[DATA],'export const ROUTER_FORMATTING_FACADE_'+suffix+'='+JSON.stringify(value(source[FACADE]))+';','export const ROUTER_FORMATTING_FACADE_'+suffix+'='+JSON.stringify(value(after[FACADE]))+';');}
 let matches="import {originalParsedSyntaxNode} from './extensions/source-links.mjs';\n"+source[MATCHES];
 matches=once(matches,'const fail = (message, span)',RECEIPT+'\nconst fail = (message, span)');
 matches=once(matches,"c.peek(4).value !== 'matches'","!['matches','matches_unit'].includes(c.peek(4).value)");
 matches=once(matches,"const name = c.peek(4), separate =","const name = c.peek(4), unit = name.value === 'matches_unit', separate =");
 matches=once(matches,"id: 'literal-matches:existing-ordered-source-pattern-parser'","id: unit ? 'unit-matches:existing-ordered-source-pattern-parser' : 'literal-matches:existing-ordered-source-pattern-parser'");
 matches=once(matches,"id: 'router-core:qualified-owned-literal-matches'","id: unit ? 'router-core:qualified-owned-unit-matches' : 'router-core:qualified-owned-literal-matches'");
 matches=once(matches,"if (node.rows[0].guard) fail('guarded patterns require a separate owned domain', node.span);","if (node.rows[0].guard) fail('guarded patterns require a separate owned domain', node.span);"+UNIT_BRANCH);
 matches=once(matches,'  return node;\n}',"  if(unit)ownedUnitMatchesParses.set(node,{parser});\n  return node;\n}");after[MATCHES]=matches;
 let context="import {originalOwnedUnitMatchesSource} from '../router-core-matches.mjs';\n"+source[CONST];
 context=once(context,'const visit=node=>{','const visit=(node,owner)=>{');
 context=once(context,"if(node.k==='routerOrderedMatch'&&node.sourceMacro?.owner==='original-standard-source')nodes.set(node,metadataDigest(node));","if(node.k==='routerOrderedMatch'&&node.sourceMacro?.owner==='original-standard-source')nodes.set(node,metadataDigest(node));\n    else if(node.k==='routerOrderedMatch'&&node.sourceMacro?.owner==='owned-router-unit-source'&&originalOwnedUnitMatchesSource(owner,node))nodes.set(node,{ownedUnitEntry:owner});");
 context=once(context,'Array.isArray(value)?value.forEach(visit):visit(value);','Array.isArray(value)?value.forEach(child=>visit(child,owner)):visit(value,owner);');
 context=once(context,'visit(entry.body);','visit(entry.body,entry);');
 context=once(context,'return !!digest&&digest===metadataDigest(node);',"if(digest&&typeof digest==='object')return originalOwnedUnitMatchesSource(digest.ownedUnitEntry,node);\n  return !!digest&&digest===metadataDigest(node);");after[CONST]=context;
 // Copy the existing private checked Copy/no-Drop unit-layout rule, including
 // its full callback body. A public metadata tag only selects this ADDITIONAL
 // refusal check; it never grants a layout or const association.
 const layoutFile=parse(ts,LAYOUT,source[LAYOUT]),layout=named(ts,layoutFile,'layout');
 let layoutSource=layout.getText(layoutFile);layoutSource=once(layoutSource,'function layout(','function ownedUnitMatchesLayout(');layoutSource=once(layoutSource,"'unit enum cast source'","'owned unit-enum matches source'");
 const ordered=parse(ts,ORDERED,source[ORDERED]),check=named(ts,ordered,'checkOrderedMatch'),anchor='const subject=checker.expr(node.subject,env,path);checker.patternDomain(subject.type,node.span);';
 if(!check.getText(ordered).includes(anchor))fail('complete checked match subject declaration differs');
 after[ORDERED]=once(source[ORDERED],'export function checkOrderedMatch(',layoutSource+'\nexport function checkOrderedMatch(');
 after[ORDERED]=once(after[ORDERED],anchor,anchor+"\n  if(node.sourceMacro?.compatibilityCore?.id==='router-core-unit-matches-v1')ownedUnitMatchesLayout(checker,subject.type,node.span);");after[ORACLE]=RUST_ORACLE;
 const layoutOrigin={path:LAYOUT,source:source[LAYOUT],span:[layout.getStart(layoutFile),layout.end],original:layout.getText(layoutFile),copy:layoutSource,nativeCopy:nativeCopy(ts,LAYOUT,source[LAYOUT])};
 // This scan records correspondence only. The genuine unit parser receipt and
 // every original parent/relocation check remain separate admission obligations.
 const links=parse(ts,LINKS,source[LINKS]),association=named(ts,links,'rangeSyntaxOrigin'),selected=[];
 const select=node=>{if(ts.isStringLiteral(node)&&node.text==='routerLetElse')selected.push(node);ts.forEachChild(node,select);};select(association);
 if(selected.length!==1||!ts.isBinaryExpression(selected[0].parent)||selected[0].parent.getText(links)!=="kind.value==='routerLetElse'")fail('one actual private association kind comparison required');
 const expression=selected[0].parent,old=expression.getText(links),replacement=old+"||kind.value==='routerOrderedMatch'";
 after[LINKS]=source[LINKS].slice(0,expression.getStart(links))+replacement+source[LINKS].slice(expression.end);
 const sourceAssociationOrigin={path:LINKS,owner:{span:[association.getStart(links),association.end],source:association.getText(links)},span:[expression.getStart(links),expression.end],before:old,after:replacement,namespaceAuthority:false,constAuthority:false};
 return {source,after,layoutOrigin,sourceAssociationOrigin};
}
function rowPlan(ts,path,before,after,root){
 const language=path.endsWith('.rs')?'Rust':'JavaScript',languageSource=[MATCHES,CONST,ORDERED,LINKS].includes(path)?after:before,input=transportConcreteSyntaxSource(before,{language}),beforeMeta=serializeConcreteSyntaxMeta(input.document),stages=[];let document=input.document,prior=before;
 const rule=(left,right,id)=>({id,edits:[{span:[0,left.length],expected:left,replacement:right}]});
 for(const phase of ['language','repository']){
  const wire=serializeConcreteSyntaxMeta(document),parent=transportConcreteSyntaxMeta(wire),target=phase==='language'?languageSource:after;if(parent.source!==prior)fail('complete stage parent differs');
  const run=applyConcreteSyntaxSubstitutions(parent.document,{languageRules:phase==='language'?[rule(prior,target,'language:copy-checked-unit-matches-and-original-source-custody')]:[],repositoryRules:phase==='repository'?[rule(prior,target,'router:bind-separate-owned-unit-matches-operation')]:[]}),afterMeta=serializeConcreteSyntaxMeta(run.value),result=transportConcreteSyntaxMeta(afterMeta);
  if(result.source!==target)fail('complete source equation differs');const inverse=applyConcreteSyntaxSubstitutions(result.document,{languageRules:phase==='language'?[rule(target,prior,'language:restore-complete-unit-input')]:[],repositoryRules:phase==='repository'?[rule(target,prior,'router:restore-original-unit-operation-input')]:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==prior)fail('complete inverse differs');
  stages.push({phase,before:prior,after:target,beforeMeta:wire,afterMeta,trace:run.trace,completeInverse:true});document=result.document;prior=target;
 }
 let current=null;try{current=readFileSync(resolve(root,path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 const nativeCopies=language==='JavaScript'?[nativeCopy(ts,path,before),nativeCopy(ts,path,after)]:[];
 return {path,before,language:languageSource,after,current,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta,afterMeta:serializeConcreteSyntaxMeta(document),inverse:before,stages,trace:stages.flatMap(stage=>stage.trace),nativeCopies,sourceLanguage:language,completeNativeAstCopy:language==='JavaScript',...(language==='JavaScript'?{nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,path),after)}:{})};
}
export function prepareCoreUnitMatches({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');const packet=originals(),result=equations(ts,packet),paths=packet.files.map(row=>row.path).filter(path=>path!==LAYOUT);
 return {schema:'router-owned-unit-matches-source-v1',typescriptVersion:ts.version,input:packet,layoutOrigin:result.layoutOrigin,sourceAssociationOrigin:result.sourceAssociationOrigin,files:paths.map(path=>rowPlan(ts,path,result.source[path],result.after[path],root)),semanticAuthority:false,runtimeExecuted:false,rustExecuted:false,newEncodedOrDigestCache:false,originalLiteralDomainUnchanged:true};
}
export function composeCoreUnitMatches(prior,options={}){const plan=prepareCoreUnitMatches(options),sources={...prior};for(const row of plan.files){if(Object.hasOwn(sources,row.path)&&sources[row.path].after!==row.before)fail('preceding complete source differs: '+row.path);sources[row.path]=row;}return {sources,layers:[plan],historicalSources:prior};}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode]=process.argv.slice(2);if(process.argv.length!==3||!['--write','--check'].includes(mode))fail('usage: --write|--check');const plan=prepareCoreUnitMatches();
 if(mode==='--write'){for(const row of plan.files)if(![row.before,row.after].includes(row.current)&&!(row.before===''&&row.current===null))fail('actual complete input differs: '+row.path);for(const row of plan.files){const path=resolve(ROOT,row.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,row.after);}}
 else if(plan.files.some(row=>row.current!==row.after))fail('complete unit matches output is stale');console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>row.path),semanticAuthority:false,rustExecuted:false}));
}
