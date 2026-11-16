// Bounded native-source candidate scheduling only. Every layer rechecks semantics.
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {floatingBodySignature} from './body-inverse-source-support.mjs';
const need=(value,message)=>{if(!value)throw new TypeError('Composite target source: '+message);};
const METHODS=new Set(['includes','startsWith','endsWith']);
export function parseCompositeTarget(source,language,names){
 need(typeof source==='string'&&Buffer.byteLength(source)<=8388608&&names instanceof Set,'bounded complete target and actual compiler name set');const concrete=transportConcreteSyntaxSource(source,{language});need(transportConcreteSyntaxMeta(concrete.meta).source===source,'complete target CST serialization/reparse inverse');const ts=ownershipCompiler(),file=ts.createSourceFile(language==='TypeScript'?'composite.mts':'composite.mjs',concrete.source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);need(!file.parseDiagnostics.length,'complete native target grammar');let cells=0;
 const inspect=(node,depth=0)=>{need(++cells<=200000&&depth<=256,'complete native target syntax bound');ts.forEachChild(node,child=>inspect(child,depth+1));};inspect(file);const rows=[],seen=new Set();
 for(const node of file.statements)if(ts.isFunctionDeclaration(node)&&node.name&&names.has(node.name.text)){need(node.body&&!seen.has(node.name.text),'unique actual complete target body');seen.add(node.name.text);rows.push({name:node.name.text,start:node.body.getStart(file),end:node.body.end,node:node.body});}
 need(rows.length===names.size,'complete original function target membership');return {source,file,rows,ts};
}
export function joinCompositeTargets(before,after){
 need(before.rows.length===after.rows.length,'whole target function membership');let oldEnd=0,newEnd=0;const pairs=[];
 for(let at=0;at<before.rows.length;at++){const left=before.rows[at],right=after.rows[at];need(left.name===right.name&&before.source.slice(oldEnd,left.start)===after.source.slice(newEnd,right.start),'complete target outside actual original function bodies must stay exact');pairs.push({left,right});oldEnd=left.end;newEnd=right.end;}
 need(before.source.slice(oldEnd)===after.source.slice(newEnd),'complete target suffix must stay exact');return pairs;
}
function tokenChanges(before,after,left,right){
 const ts=before.ts,edits=[];let cells=0;
 const compare=(a,b,depth=0)=>{
  if(++cells>100000||depth>160)return false;
  const boolean=node=>node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword;
  const literal=node=>ts.isStringLiteral(node)||ts.isBigIntLiteral(node)||boolean(node);
  if(literal(a)&&literal(b)){
   if(!(boolean(a)&&boolean(b))&&a.kind!==b.kind)return false;
   const original=a.getText(before.file),requested=b.getText(after.file);if(original!==requested)edits.push({kind:'literal',start:a.getStart(before.file),end:a.end,nextStart:b.getStart(after.file),nextEnd:b.end,before:original,after:requested});return true;
  }
  if(a.kind!==b.kind)return false;
  if(ts.isIdentifier(a)&&ts.isIdentifier(b)&&a.text!==b.text){
   const property=(node,file)=>ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node&&ts.isCallExpression(node.parent.parent)&&node.parent.parent.expression===node.parent&&METHODS.has(node.text)&&node.getText(file)===node.text;
   if(!property(a,before.file)||!property(b,after.file))return false;edits.push({kind:'method',start:a.getStart(before.file),end:a.end,nextStart:b.getStart(after.file),nextEnd:b.end,before:a.text,after:b.text});return true;
  }
  if(ts.isTypeNode(a))return a.getText(before.file)===b.getText(after.file);
  const aa=[],bb=[];ts.forEachChild(a,node=>{aa.push(node);});ts.forEachChild(b,node=>{bb.push(node);});if(aa.length!==bb.length)return false;for(let at=0;at<aa.length;at++)if(!compare(aa[at],bb[at],depth+1))return false;return true;
 };
 if(!compare(left.node,right.node))return null;edits.sort((a,b)=>a.start-b.start);let oldEnd=left.start,newEnd=right.start;
 for(const row of edits){if(row.start<oldEnd||row.nextStart<newEnd||before.source.slice(oldEnd,row.start)!==after.source.slice(newEnd,row.nextStart))return null;oldEnd=row.end;newEnd=row.nextEnd;}
 return before.source.slice(oldEnd,left.end)===after.source.slice(newEnd,right.end)?edits:null;
}
function substitute(source,edits){
 edits.sort((a,b)=>a.start-b.start);let cursor=0;const result=[];for(const row of edits){need(row.start>=cursor&&source.slice(row.start,row.end)===row.before,'nonoverlapping complete actual native source substitution');result.push(source.slice(cursor,row.start),row.after);cursor=row.end;}result.push(source.slice(cursor));return result.join('');
}
export function projectCompositeTokenLayer(before,after,kind){
 need(['literal','method'].includes(kind),'closed existing source rule family');const edits=[];for(const {left,right}of joinCompositeTargets(before,after)){if(before.source.slice(left.start,left.end)===after.source.slice(right.start,right.end))continue;const changed=tokenChanges(before,after,left,right);if(changed)for(const row of changed)if(row.kind===kind)edits.push({...row,name:left.name});}
 return {source:substitute(before.source,edits),count:edits.length,selections:edits.map(({name,start,end,before,after})=>({name,span:[start,end],before,after,sourceAuthority:false,semanticAuthority:false})),sourceAuthority:false,semanticAuthority:false};
}
export function projectCompositeSemanticBodies(before,after){
 const edits=[];
 for(const {left,right}of joinCompositeTargets(before,after))if(JSON.stringify(floatingBodySignature(left.node,before.ts,before.source,before.file))!==JSON.stringify(floatingBodySignature(right.node,after.ts,after.source,after.file)))edits.push({name:left.name,start:left.start,end:left.end,before:before.source.slice(left.start,left.end),after:after.source.slice(right.start,right.end)});
 return {source:substitute(before.source,edits),count:edits.length,sourceAuthority:false,semanticAuthority:false};
}
export function assertCompositeTargetReproduction(requested,actual){
 for(const {left,right}of joinCompositeTargets(requested,actual))need(JSON.stringify(floatingBodySignature(left.node,requested.ts,requested.source,requested.file))===JSON.stringify(floatingBodySignature(right.node,actual.ts,actual.source,actual.file)),'complete final native body/static-type reproduction differs');
 return true;
}
