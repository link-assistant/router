// Native scalar declarations remain DATA until the complete linked TypeScript
// body has passed the existing independent semantic pipeline.
import {createScalarTypeResolver} from './typed-scalar-aliases.mjs';
import {ABSENCE_HELPERS} from './typed-absence-targets.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {rustSyntaxCells,equalRustSyntaxCells} from '../rust-syntax-cells.mjs';
const fail=message=>{throw new TypeError('Portable module Rust types: '+message);};
const primitives={string:'String',number:'f64',boolean:'bool',null:'JsNull',undefined:'JsUndefined'};
const rustKeywords=new Set('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final macro override priv typeof unsized virtual yield try'.split(' '));
export function publicScalarRustTypes(ts,source,exports_,rust){
 if(!exports_.length)return {declarations:'',helpers:'',rows:[]};
 const file=ts.createSourceFile('public-scalars.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 if(file.parseDiagnostics.length)fail('complete native TypeScript grammar required');
 const aliases=new Map(file.statements.filter(ts.isTypeAliasDeclaration).map(node=>[node.name.text,node]));
 const kinds=new Map([[ts.SyntaxKind.StringKeyword,'string'],[ts.SyntaxKind.NumberKeyword,'number'],[ts.SyntaxKind.BooleanKeyword,'boolean'],[ts.SyntaxKind.UndefinedKeyword,'undefined']]);
 const resolver=createScalarTypeResolver({ts,kinds,aliases,file});resolver.validateAliases();
 const rows=exports_.map(row=>{
  const node=aliases.get(row.internalName);if(!node||node.typeParameters?.length)fail('public generic alias constraints require their own Rust API rule');
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(row.publicName)||rustKeywords.has(row.publicName))fail('ordinary non-keyword public Rust type name required');
  const domain=resolver.resolve(node.type),parts=domain.split('|');
  const target=parts.length===1?primitives[parts[0]]:(parts[1]==='null'?'JsNullable':'JsOptional')+'<'+primitives[parts[0]]+'>';
  if(!target||parts.length>2)fail('closed scalar target required');
  return {...row,domain,target,originalDeclaration:node.getText(file),span:[node.getStart(file),node.end],declaration:'pub type '+row.publicName+' = '+target+';',sourceAuthority:false,semanticAuthority:false};
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
 return {declarations:rows.map(row=>row.declaration).join('\n')+'\n',helpers,rows};
}
