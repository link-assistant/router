// Native scalar declarations remain DATA until the complete linked TypeScript
// body has passed the existing independent semantic pipeline.
import {createScalarTypeResolver} from './typed-scalar-aliases.mjs';
import {ABSENCE_HELPERS} from './typed-absence-targets.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {rustSyntaxCells,equalRustSyntaxCells} from '../rust-syntax-cells.mjs';
const fail=message=>{throw new TypeError('Portable module Rust types: '+message);};
const primitives={string:'::std::string::String',number:'::core::primitive::f64',boolean:'::core::primitive::bool',null:'JsNull',undefined:'JsUndefined'};
const rustKeywords=new Set('as async await break const continue crate dyn else enum extern false fn for gen if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final macro override priv typeof unsized virtual yield try'.split(' '));
export function publicScalarRustTypes(ts,source,exports_,rust,{nativeScalarContext=null,nativeScalarSourcePath,nativeScalarOutputPath}={}){
 if(!exports_.length)return {declarations:'',helpers:'',rows:[]};
 const file=ts.createSourceFile('public-scalars.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 if(file.parseDiagnostics.length)fail('complete native TypeScript grammar required');
 const allAliases=new Map(file.statements.filter(ts.isTypeAliasDeclaration).map(node=>[node.name.text,node])),aliases=new Map(),active=new Set();
 function select(name,depth=0){if(depth>64||active.has(name))fail('bounded acyclic public scalar alias closure required');if(aliases.has(name))return;const node=allAliases.get(name);if(!node)fail('actual public scalar alias declaration required');active.add(name);const parameters=new Set((node.typeParameters??[]).map(row=>row.name.text));let cells=0;const visit=value=>{if(++cells>100000)fail('complete public scalar closure bound exceeded');if(ts.isTypeReferenceNode(value)&&ts.isIdentifier(value.typeName)&&!parameters.has(value.typeName.text)&&allAliases.has(value.typeName.text))select(value.typeName.text,depth+1);ts.forEachChild(value,visit);};visit(node);active.delete(name);aliases.set(name,node);}
 for(const row of exports_)select(row.internalName);
 const kinds=new Map([[ts.SyntaxKind.StringKeyword,'string'],[ts.SyntaxKind.NumberKeyword,'number'],[ts.SyntaxKind.BooleanKeyword,'boolean'],[ts.SyntaxKind.UndefinedKeyword,'undefined']]);
 const nativeScalarSourceProposal=nativeScalarContext?proposeOwnedPublicNativeScalarAliases(source,{context:nativeScalarContext,sourcePath:nativeScalarSourcePath,outputPath:nativeScalarOutputPath}):null,nativeByName=new Map((nativeScalarSourceProposal?.aliases??[]).map(row=>[row.name,row])),legacyAliases=new Map([...aliases].filter(([name])=>!nativeByName.has(name)));const resolver=createScalarTypeResolver({ts,kinds,aliases:legacyAliases,file});resolver.validateAliases();
 const rows=exports_.map(row=>{
  const node=aliases.get(row.internalName);if(!node||node.typeParameters?.length)fail('public generic alias constraints require their own Rust API rule');
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(row.publicName)||row.publicName==='_'||rustKeywords.has(row.publicName))fail('ordinary non-keyword public Rust type name required');
  const native=nativeByName.get(row.internalName),domain=native?'rust:'+native.scalar:resolver.resolve(node.type),parts=domain.split('|');if(!native&&!['string','number','boolean'].includes(domain))fail('owned public scalar interface requires an actual closed String f64 bool or native integer domain');
  const target=native?native.rust:parts.length===1?primitives[parts[0]]:(parts[1]==='null'?'JsNullable':'JsOptional')+'<'+primitives[parts[0]]+'>';
  if(!target||parts.length>2)fail('closed scalar target required');
  return {...row,domain,target,...(native?{nativeScalar:native.scalar,nativeAlias:native.alias}:{}),originalDeclaration:node.getText(file),span:[node.getStart(file),node.end],declaration:'pub type '+row.publicName+' = '+target+';',sourceAuthority:false,semanticAuthority:false};
 });
 const needsAbsence=rows.some(row=>/\bJs(?:Null|Undefined|Nullable|Optional)\b/u.test(row.target)),existing=sourceItems(rust),known=sourceItems(ABSENCE_HELPERS);
 let helpers='';
 if(needsAbsence){
  const seen=known.map(item=>existing.filter(candidate=>candidate.name===item.name));
  if(seen.some(items=>items.length)){
   if(seen.some(items=>items.length!==1))fail('complete existing absence helper family required');
   for(let at=0;at<known.length;at++)if(!equalRustSyntaxCells(rustSyntaxCells(rust.slice(seen[at][0].start,seen[at][0].end)),rustSyntaxCells(ABSENCE_HELPERS.slice(known[at].start,known[at].end))))fail('actual complete absence helper differs');
  }else helpers=ABSENCE_HELPERS+'\n';
 }
 const names=new Set(existing.map(item=>item.name).filter(Boolean));
 for(const row of rows)if(names.has(row.publicName))fail('public scalar alias collides with an implementation declaration');
 return {declarations:rows.map(row=>row.declaration).join('\n')+'\n',helpers,rows,...(nativeScalarSourceProposal?.active===true?{nativeScalarSourceProposal}:{}),sourceAliases:[...aliases.values()].map(node=>({name:node.name.text,source:nativeByName.get(node.name.text)?.after??node.getText(file),...(nativeByName.has(node.name.text)?{originalSource:node.getText(file)}:{}),span:[node.getStart(file),node.end]}))};
}

import {proposeOwnedPublicNativeScalarAliases} from './owned-public-native-scalar-source.mjs';
