// Separate named-rule DATA transaction, derived from the complete existing one.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourcePhases} from './concrete-phased-equations.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const BASE='tools/translation/private-parser-phased-equations.mjs';
const TARGET='tools/translation/private-parser-named-phases.mjs';
const BASE_SHA256='2f511be5ffc068049366ea34ec7482a9d653f1f90cfbc39e11a738a5785a0e20';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Named phase producer: '+message);};
const one=(rows,name)=>{if(rows.length!==1)fail('one actual native '+name+' required');return rows[0];};

// Native-selected complete function; only captured reflection reaches input.
function namedRuleSnapshot(input,current,count){
 const snapshots=[];
 function array(value,size){
  if(!value||typeof value!=='object'||proxy(value)||!current.g.Array.isArray(value)||prototype(value)!==current.g.Array.prototype)fail('named rules require dense own-data arrays');
  const names=keys(value),expected=[];for(let at=0;at<size;at++)expected.push(''+at);expected.push('length');
  if(names.length!==expected.length)fail('named rule shape differs');
  for(let at=0;at<names.length;at++)if(names[at]!==expected[at])fail('named rule fields differ');
  const fields=[];for(let at=0;at<names.length;at++){
   const field=descriptor(value,names[at]);if(!field||!own(field,'value')||at<size&&field.enumerable!==true)fail('named rule own data required');fields.push(field);
  }
  if(fields[size].value!==size)fail('named rule length differs');
  snapshots.push({value,parent:current.g.Array.prototype,names,fields});return fields;
 }
 if(count<1||count>85||count%1)fail('complete named phase triples required');
 const outer=array(input,count),rows=[];
 for(let at=0;at<count;at++){
  const fields=array(outer[at].value,4),row=[];
  for(let index=0;index<4;index++){
   const name=fields[index].value;if(typeof name!=='string'||name.length<1||name.length>160)fail('bounded primitive rule identifier required');row.push(name);
  }
  rows.push(row);
 }
 return {rows,snapshots};
}

export function prepareConcreteNamedPhases({root=ROOT}={}){
 root=resolve(root);const before=readFileSync(resolve(root,BASE),'utf8'),ts=ownershipCompiler();
 if(ts.version!=='5.9.3'||hash(before)!==BASE_SHA256)fail('installed TypeScript 5.9.3 and complete original transaction required');
 const parse=(path,source)=>{const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;};
 const file=parse(BASE,before),select=name=>one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),name);
 const factory=select('originalPhasedEquationRows'),kernel=select('transportPrivateConcretePhases'),edits=[];
 const change=(source,expected,replacement)=>{if(source.split(expected).length!==2)fail('unique native source selection differs');return source.replace(expected,()=>replacement);};
 let factoryAfter=change(factory.getText(file),'originalPhasedEquationRows(rows,equationApply,equationSerialize,equationReceive)','originalNamedPhasedEquationRows(rows,equationApply,equationSerialize,equationReceive,identifiers)');
 factoryAfter=change(factoryAfter,"'source-phases:complete-'+phase+'-edit'","identifiers[at/3][phase==='language'?0:1]");
 factoryAfter=change(factoryAfter,"'source-phases:complete-'+phase+'-inverse'","identifiers[at/3][phase==='language'?2:3]");
 let kernelAfter=change(kernel.getText(file),'transportPrivateConcretePhases(input)','transportPrivateConcreteNamedPhases(input,identifiers)');
 kernelAfter=change(kernelAfter,'const request=batchSnapshot(input,current);active=true;','const request=batchSnapshot(input,current),named=namedRuleSnapshot(identifiers,current,request.rows.length/3);active=true;');
 kernelAfter=change(kernelAfter,'originalPhasedEquationRows(rows,equationApply,equationSerialize,transport)','originalNamedPhasedEquationRows(rows,equationApply,equationSerialize,transport,named.rows)');
 kernelAfter=change(kernelAfter,'batchInputCurrent(request.snapshots);','batchInputCurrent(request.snapshots);batchInputCurrent(named.snapshots);');
 for(const [node,after]of [[factory,factoryAfter],[kernel,kernelAfter]])edits.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:after});
 let middle=before;
 for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
  if(middle.slice(...edit.span)!==edit.expected)fail('whole native source span changed');middle=middle.slice(0,edit.span[0])+edit.replacement+middle.slice(edit.span[1]);
 }
 const self=readFileSync(fileURLToPath(import.meta.url),'utf8'),selfFile=parse('prepare-concrete-named-phases.mjs',self);
 const snapshot=one(selfFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='namedRuleSnapshot'),'snapshot function');
 const after=middle+'\n// Named rule data has its own complete descriptor rejoin.\n'+snapshot.getText(selfFile)+'\n';
 parse(TARGET,middle);parse(TARGET,after);if(after.split('\n').length>=1000)fail('complete file exceeds line bound');
 const [equation]=transportConcreteSourcePhases([{before,middle,after,language:'JavaScript'}]);
 if(equation.inverse!==before||readFileSync(resolve(root,BASE),'utf8')!==before||readFileSync(fileURLToPath(import.meta.url),'utf8')!==self)fail('complete source input or inverse changed');
 let current=null;try{current=readFileSync(resolve(root,TARGET),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(current!==null&&current!==after)fail('unknown complete generated target');
 return {schema:'named-concrete-source-phases-v1',file:{path:TARGET,before,middle,after,current,equation,beforeSha256:hash(before),afterSha256:hash(after),nativeEdits:edits},originalPrivateTransactionUnchanged:true,semanticAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv.slice(2).join(' ');if(!['--write','--check'].includes(mode))fail('use --write|--check');const plan=prepareConcreteNamedPhases(),row=plan.file;
 if(mode==='--write')writeFileSync(resolve(ROOT,row.path),row.after);
 else if(row.current!==row.after)fail('complete generated named phase transaction is stale');
 console.log(JSON.stringify({path:row.path,sha256:row.afterSha256,semanticAuthority:false}));
}
