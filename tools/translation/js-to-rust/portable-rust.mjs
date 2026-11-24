// Canonical scalar Rust -> checked meta -> checked JS/TS. No local Rust tool.
import * as targets from './typed-absence-targets.mjs';
import {parseRustItem} from './vendor/portable-rust-frontends.mjs';
import {check,signatures,toLino} from './vendor/typed-absence-ir.mjs';
import {isRefusal} from './vendor/constructs.mjs';
import {parseMeta} from './typed-absence-translator.mjs';
import {optionalType} from './vendor/return-types.mjs';
import {translateTypeScript} from './typed-portable.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {portableRustModuleEnvelope,translatePortableRustModule} from './portable-rust-module.mjs';
import {rustSyntaxCells,equalRustSyntaxCells,sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';

export class UnsupportedPortableRustSource extends TypeError {
 constructor(message){super('Canonical portable Rust source: '+message);this.name='UnsupportedPortableRustSource';}
}
const refuse=message=>{throw new UnsupportedPortableRustSource(message);};
function syntax(source){
 return rustSyntaxCells(source);
}
function sameSyntax(left,right){return sameRustSourceSyntax(left,right);}
function originalHelpers(){
 const rows=[];for(const [name,source]of Object.entries(targets))if(typeof source==='string'&&/_HELPERS?$/u.test(name)){
  for(const item of sourceItems(source)){if(item.comment)continue;const text=source.slice(item.start,item.end);rows.push({family:name,source:text,syntax:syntax(text)});}
 }return rows;
}
function completeReturn(body){return body.some(statement=>statement.kind==='return'||statement.kind==='if'&&statement.else!==null&&completeReturn(statement.then)&&completeReturn(statement.else));}
function decode(source,allowModuleHelpers=false){
 const helpers=originalHelpers(),items=sourceItems(source),program=[],selected=[],names=new Set();if(items.length>4096)refuse('bounded complete source item census required');
 for(const item of items){
  if(item.comment)continue;
  if(item.name&&item.term!=='impl'){if(names.has(item.name))refuse('duplicate original source binding');names.add(item.name);}
  const text=source.slice(item.start,item.end),tokens=syntax(text),matches=helpers.filter(helper=>equalRustSyntaxCells(helper.syntax,tokens));
  if(matches.length){selected.push({span:[item.start,item.end],source:text,families:matches.map(helper=>helper.family),implementation:'original-complete-emitter-library-source',sourceAuthority:false,semanticAuthority:false});continue;}
  if(!['fn','const'].includes(item.term))refuse('source item has no scalar canonical inverse: '+item.term);
  // Native Rust-CST tokens preserve nested comments, literal spellings and
  // whole source coordinates. No replacement module/item subset is accepted.
  const parsed=parseRustItem(item.tokens);
  if(parsed.kind==='function'&&(!completeReturn(parsed.body)||parsed.params.some(parameter=>!['number','string','boolean','null','undefined'].includes(parameter.type)&&!['number','string','boolean'].includes(optionalType(parameter.type)?.primitive))))refuse('closed primitive signature and complete return paths required');
  program.push(parsed);
 }
 if(!program.length)refuse('nonempty original application program required');
 const table=signatures(program),checked=program.map(item=>check(item,table)),meta=checked.map(toLino).join('\n')+'\n',reparsed=parseMeta(meta);
 const canonicalRust=targets.emitRust(reparsed);
 if(!sameSyntax(source,canonicalRust)){
  if(!allowModuleHelpers)refuse('complete source is outside the actual emitter normal form');
  // Only exact original emitter helper items may be unneeded by the inner
  // application. The enclosing module must reproduce every such byte again.
  const canonicalHelpers=sourceItems(canonicalRust).filter(item=>!item.comment).map(item=>syntax(canonicalRust.slice(item.start,item.end)));
  const unneeded=selected.filter(item=>!canonicalHelpers.some(tokens=>equalRustSyntaxCells(syntax(item.source),tokens)));
  let application=source;for(const item of [...unneeded].sort((a,b)=>b.span[0]-a.span[0]))application=application.slice(0,item.span[0])+application.slice(item.span[1]);
  if(!sameSyntax(application,canonicalRust))refuse('complete checked inner application differs from its actual emitter normal form');
 }
 return {program:reparsed,meta,canonicalRust,selectedHelpers:selected};
}
function translateScalarRust(source,{sourcePath='input.rs'}={},allowModuleHelpers=false){
 if(typeof source!=='string'||source.length>2097152)refuse('bounded complete primitive source required');
 let original,decoded,projection;const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'rust:transport-complete-original-CST-before-canonical-source-decoding',apply:()=>{original=transportConcreteSyntaxSource(source,{language:'Rust'});if(original.source!==source)refuse('whole original CST source differs');return original.source;}},
   {id:'rust:decode-scalar-source-and-require-fresh-full-Rust-reemission',apply:value=>{decoded=decode(value,allowModuleHelpers);return decoded;}},
   {id:'meta:emit-and-independently-check-complete-typescript-javascript',apply:value=>{projection=translateTypeScript(targets.emitTypeScript(value.program),{sourcePath:sourcePath.replace(/\.rs$/u,'.ts')});if(!sameSyntax(decoded.canonicalRust,projection.rust))refuse('checked JavaScript does not reproduce the complete Rust syntax');return projection;}},
  ]},
  {phase:'repository',rules:[{id:'router:retain-original-Rust-and-both-checked-meta-source-equations',apply:value=>{
   const equation=transportConcreteSourceEquations([{before:source,after:decoded.canonicalRust,language:'Rust'}])[0];if(equation.inverse!==source)refuse('complete Rust source inverse differs');
   return {...value,rust:allowModuleHelpers?decoded.canonicalRust:source,portableRustSourceHistory:{sourcePath,originalRustConcreteSyntax:original.meta,canonicalRust:decoded.canonicalRust,originalDecodedMeta:decoded.meta,checkedJavaScriptMeta:projection.meta,selectedHelpers:decoded.selectedHelpers,equation,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false},runtimeParity:false,wholeRouterSynchronization:false};
  }}]},
 ]);
 try{const result=run.run(source);return {...result.value,portableRustRuleTrace:result.trace};}
 catch(error){if(isRefusal(error))throw new UnsupportedPortableRustSource(error.message);throw error;}
}

export function translatePortableRust(source,options){
 if(typeof source!=='string'||source.length>2097152)refuse('bounded complete primitive source required');
 const envelope=portableRustModuleEnvelope(source);
 if(envelope)return translatePortableRustModule(source,envelope,options,translateScalarRust);
 return translateScalarRust(source,options);
}
