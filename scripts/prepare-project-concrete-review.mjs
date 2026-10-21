// Copies the original bounded inert-data guard; stored concrete syntax and
// semantic metadata have separate required reviews. Neither grants authority.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ownershipCompiler} from '../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from '../tools/translation/rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from '../tools/translation/concrete-syntax-meta.mjs';
const concrete=source=>{const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);if(transportConcreteSyntaxMeta(wire).source!==source)throw Error('Complete review-source CST differs');return wire;};
const wrapper=`
function nativeData(){if(!originalJsonIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())throw new TypeError('Stored project review requires unchanged native data operations');}
export function projectSemanticReviewMetadata(meta,{readSource}={}){
 nativeData();
 if(!meta||typeof meta!=='object'||utilTypes.isProxy(meta)||![Object.prototype,null].includes(Object.getPrototypeOf(meta)))throw new TypeError('Stored project review requires plain metadata');
 const prototype=Object.getPrototypeOf(meta),keys=Reflect.ownKeys(meta),fields=Object.getOwnPropertyDescriptors(meta),semanticMetadata={__proto__:null};
 for(const key of keys){const field=fields[key];if(typeof key!=='string'||!Object.hasOwn(field,'value'))throw new TypeError('Stored project review rejects metadata accessors');if(key!=='concreteSyntaxMeta')semanticMetadata[key]=field.value;}
 assertGeneratedReviewData(semanticMetadata);
 if(!Object.hasOwn(fields,'concreteSyntaxMeta'))return {semanticMetadata,concreteSyntaxReview:[],scope:'Legacy semantic metadata; no concrete field supplied.'};
 const rows=fields.concreteSyntaxMeta.value;assertGeneratedReviewData(rows);
 if(!Array.isArray(rows)||typeof readSource!=='function'||!Array.isArray(semanticMetadata.sources))throw new TypeError('Stored project review requires complete concrete rows and original source reader');
 nativeData();const before=JSON.stringify(rows),sourcesBefore=JSON.stringify(semanticMetadata.sources),wanted={__proto__:null},seen={__proto__:null},concreteSyntaxReview=[];
 for(const source of semanticMetadata.sources){if(!source||typeof source.source!=='string'||!source.source||source.source.includes('\\\\')||/[\\x00-\\x1f]/u.test(source.source)||source.source.startsWith('/')||source.source.split('/').some(part=>!part||part==='.'||part==='..')||typeof source.sha256!=='string'||!/^[a-f0-9]{64}$/.test(source.sha256))throw new TypeError('Stored concrete review requires exact original source records');if(wanted[source.source]!==undefined&&wanted[source.source]!==source.sha256)throw new TypeError('Stored concrete source identities conflict');wanted[source.source]=source.sha256;}
 for(const row of rows){
  if(!row||Array.isArray(row)||Reflect.ownKeys(row).sort().join(',')!=='document,source'||typeof row.source!=='string'||seen[row.source]||wanted[row.source]===undefined)throw new TypeError('Stored concrete review requires unique complete original rows');
  const source=readSource(row.source);if(typeof source!=='string')throw new TypeError('Stored concrete source reader must return a primitive string');
  const wire=serializeConcreteSyntaxMeta(row.document),reparsed=transportConcreteSyntaxMeta(wire),sha256=createHash('sha256').update(source).digest('hex');
  if(reparsed.document.language!=='Rust'||reparsed.source!==source||sha256!==wanted[row.source])throw new Error('Stored concrete document differs from its complete original source: '+row.source);
  seen[row.source]=true;concreteSyntaxReview.push({source:row.source,sha256,bytes:Buffer.byteLength(source),documentSha256:createHash('sha256').update(wire).digest('hex'),wholeConcreteSourceChecked:true,semanticAuthority:false,runtimeParity:false});
 }
 nativeData();assertGeneratedReviewData(rows);assertGeneratedReviewData(semanticMetadata);
 if(JSON.stringify(rows)!==before||JSON.stringify(semanticMetadata.sources)!==sourcesBefore||JSON.stringify(Object.keys(seen).sort())!==JSON.stringify(Object.keys(wanted).sort()))throw new Error('Stored concrete sources changed or complete row census differs');
 const currentKeys=Reflect.ownKeys(meta);if(Object.getPrototypeOf(meta)!==prototype||currentKeys.length!==keys.length||currentKeys.some((key,index)=>key!==keys[index]))throw new Error('Stored project metadata root changed');
 for(const key of keys){const field=Object.getOwnPropertyDescriptor(meta,key),prior=fields[key];if(!field||!Object.hasOwn(field,'value')||field.value!==prior.value||field.enumerable!==prior.enumerable||field.writable!==prior.writable||field.configurable!==prior.configurable)throw new Error('Stored project metadata field changed');}
 return {semanticMetadata,concreteSyntaxReview,scope:'Complete concrete syntax and complete semantic metadata receive separate required validation; original per-review guards and whole storage byte limits remain unchanged.'};
}
`;
export function deriveProjectConcreteReviewSource(source){
 if(typeof source!=='string'||Buffer.byteLength(source)>1048576)throw new TypeError('Complete bounded actual reviewer source required');const ts=ownershipCompiler();if(ts.version!=='5.9.3')throw Error('Installed TypeScript 5.9.3 required');const file=ts.createSourceFile('scripts/review-translation-draft.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)throw Error('Complete reviewer grammar failed');
 const nodes=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='assertGeneratedReviewData');if(nodes.length!==1)throw Error('Actual complete data guard required');const node=nodes[0],guard=node.getText(file);
 const imports="// Generated by prepare-project-concrete-review.mjs; DATA validation only.\nimport {createHash} from 'node:crypto';\nimport {types as utilTypes} from 'node:util';\nimport {serializeConcreteSyntaxMeta,transportConcreteSyntaxMeta} from '../tools/translation/concrete-syntax-meta.mjs';\nimport {originalJsonIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from '../tools/translation/original-json-intrinsics.mjs';\n";
 const result=createRulePipeline([{phase:'language',rules:[{id:'review:copy-complete-original-inert-data-guard',apply:value=>{if(value!==guard)throw Error('Complete actual guard changed');return value;}}]},{phase:'repository',rules:[{id:'review:separate-complete-concrete-and-semantic-representations',apply:value=>imports+value+'\n'+wrapper}]}]).run(guard),text=result.value;
 const parsed=ts.createSourceFile('scripts/project-concrete-review.mjs',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(parsed.parseDiagnostics.length)throw Error('Complete concrete reviewer grammar failed');if(text.slice(imports.length,-('\n'+wrapper).length)!==guard)throw Error('Complete original guard inverse differs');
 return {path:'scripts/project-concrete-review.mjs',text,kernel:{source:guard,span:[node.getStart(file),node.end],meta:concrete(guard)},meta:concrete(text),inverse:guard,trace:result.trace,originalGuardUnchanged:true,semanticAuthority:false};
}
function main(){const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))throw Error('Use --emit or --check');const proposal=deriveProjectConcreteReviewSource(readFileSync(new URL('./review-translation-draft.mjs',import.meta.url),'utf8'));if(args[0]==='--check'){if(readFileSync(new URL('./project-concrete-review.mjs',import.meta.url),'utf8')!==proposal.text)throw Error('Copied concrete review helper is stale');console.log(JSON.stringify({fresh:true,path:proposal.path,semanticAuthority:false}));}else console.log(JSON.stringify(proposal));}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main();
