// Compose complete historical source equations. This DATA grants no admission.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {composeCoreUnitMatches} from './prepare-core-unit-matches.mjs';
import {prepareCoreUnicodePredicates} from './prepare-core-unicode-predicates.mjs';
import {prepareSharedF64MethodReceivers} from './prepare-shared-f64-method-receivers.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-source-origin-phases.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const FACADE='rust/src/translation_core.rs',LEAF='rust/src/translation_core/primitives.rs',DATA='tools/translation/router-core-source-data.mjs',HOST='tools/translation/extensions/host-contracts.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Current unit/Unicode source composition: '+message);};
function replace(source,before,after){
 if(source.split(before).length!==2)fail('unique complete DATA binding required');
 return source.replace(before,()=>after);
}
function bind(source,name,before,after){
 for(const suffix of ['SOURCE','SHA256']){
  const value=text=>suffix==='SOURCE'?text:hash(text);
  source=replace(source,'export const '+name+'_'+suffix+'='+JSON.stringify(value(before))+';',
   'export const '+name+'_'+suffix+'='+JSON.stringify(value(after))+';');
 }
 return source;
}
function nativeCopy(ts,path,source){
 const parse=text=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;};
 const file=parse(source),copies=file.statements.map(node=>ts.getSynthesizedDeepClone(node));
 const detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};copies.forEach(detach);
 const copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,copies));
 const shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};
 if(JSON.stringify(shape(parse(copy)))!==JSON.stringify(shape(file)))fail('complete native AST copy differs');
 return {source,copy,completeNativeAstCopy:true};
}
function joinedRow(original,before,after,ts,equation){
 const language=original.sourceLanguage;
 if(equation.before!==before||equation.middle!==before||equation.after!==after||equation.inverse!==before)fail('complete joined source equation differs');
 const stages=equation.stages.map(({phase,before,after,beforeMeta,afterMeta,trace})=>({phase,before,after,beforeMeta,afterMeta,trace,completeInverse:true}));
 return {...original,before,language:before,after,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:equation.beforeMeta,afterMeta:equation.afterMeta,inverse:before,stages,trace:stages.flatMap(stage=>stage.trace),nativeCopies:language==='JavaScript'?[nativeCopy(ts,original.path,before),nativeCopy(ts,original.path,after)]:[]};
}

export function composeCurrentCoreUnitMatches(prior,options={}){
 const unit=composeCoreUnitMatches(prior,options),unicode=prepareCoreUnicodePredicates(options),ts=ownershipCompiler();
 if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');
 const original=Object.fromEntries(unicode.files.map(row=>[row.path,row])),unitFacade=unit.sources[FACADE],unitData=unit.sources[DATA];
 if(unitFacade.before!==original[FACADE].before||!unitFacade.after.startsWith(unitFacade.before)||unitData.before!==original[DATA].before)fail('complete common historical parents differ');
 const facade=original[FACADE].after+unitFacade.after.slice(unitFacade.before.length);
 const fromUnicode=bind(original[DATA].after,'ROUTER_FORMATTING_FACADE',original[FACADE].after,facade);
 let fromUnit=bind(unitData.after,'ROUTER_FORMATTING_FACADE',unitFacade.after,facade);
 fromUnit=bind(fromUnit,'ROUTER_CORE_PRIMITIVES',original[LEAF].before,original[LEAF].after);
 if(fromUnit!==fromUnicode)fail('independent complete DATA composition paths differ');
 const joins=new Map([[FACADE,facade],[DATA,fromUnicode]]),sources={...unit.sources},files=[];
 const joined=unicode.files.filter(row=>joins.has(row.path)),equations=transportConcreteNamedSourcePhases(joined.map(row=>({before:sources[row.path].after,middle:sources[row.path].after,after:joins.get(row.path),language:row.sourceLanguage,rules:['unit-unicode:retain-complete-unit-source','router:compose-complete-unit-and-unicode-sources','unit-unicode:restore-language-input','router:restore-complete-unit-source']})));
 for(const row of unicode.files){
  const preceding=sources[row.path];
  if(joins.has(row.path))files.push(joinedRow(row,preceding.after,joins.get(row.path),ts,equations[joined.indexOf(row)]));
  else {if(preceding&&preceding.after!==row.before)fail('preceding complete source differs: '+row.path);files.push(row);}
 }
 for(const row of files)sources[row.path]=row;
 const layer={schema:'router-current-unit-unicode-source-v1',typescriptVersion:ts.version,files,originalUnicodePlan:unicode,
  dataDiamond:{fromUnicode,fromUnit},semanticAuthority:false,runtimeExecuted:false,rustExecuted:false,newEncodedOrDigestCache:false};
 // Keep both historical layers exact. Only the final source map receives the
 // independently prepared receiver successor, with its whole predecessor.
 const receiverEvolution=prepareSharedF64MethodReceivers(options);
 const receiver=receiverEvolution.files.find(row=>row.path===HOST),historical=sources[HOST];
 if(!receiver||!historical||historical.after!==receiver.before)fail('complete Unicode/receiver predecessor differs');
 const [receiverEquation]=transportConcreteNamedSourcePhases([{
  before:historical.before,middle:historical.before,after:receiver.after,language:historical.sourceLanguage,
  rules:['unit-unicode:retain-complete-host-parent','router:compose-complete-host-receiver','unit-unicode:restore-complete-host-parent','router:restore-complete-host-receiver'],
 }]);
 sources[HOST]={...joinedRow(historical,historical.before,receiver.after,ts,receiverEquation),sourceHistory:[historical,receiver]};
 for(const row of receiverEvolution.files)if(readFileSync(resolve(options.root??ROOT,row.path),'utf8')!==row.current)fail('complete receiver input changed during composition');
 return {sources,layers:[...unit.layers,layer],historicalSources:prior,receiverEvolution};
}
export function prepareCurrentCoreUnitUnicode(options={}){
 const result=composeCurrentCoreUnitMatches({},options);
 return {...result,schema:'router-current-unit-unicode-preparation-v1',files:Object.values(result.sources),semanticAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode]=process.argv.slice(2);if(process.argv.length!==3||!['--write','--check'].includes(mode))fail('usage: --write|--check');
 const plan=prepareCurrentCoreUnitUnicode();
 if(mode==='--write'){
  for(const row of plan.files){
   const known=[...plan.layers.flatMap(layer=>[...layer.files,...(layer.originalUnicodePlan?.files??[])]),...plan.receiverEvolution.files].filter(other=>other.path===row.path).flatMap(other=>[other.before,other.after]);
   if(!known.includes(row.current)&&!(row.current===null&&known.includes('')))fail('unknown complete physical input: '+row.path);
  }
  for(const row of plan.files){
   const path=resolve(ROOT,row.path);let current=null;try{current=readFileSync(path,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
   if(current!==row.current)fail('physical source changed during preparation: '+row.path);
   mkdirSync(dirname(path),{recursive:true});writeFileSync(path,row.after);
  }
 }else if(plan.files.some(row=>row.current!==row.after))fail('complete joined source is stale');
 console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),semanticAuthority:false,rustExecuted:false}));
}
