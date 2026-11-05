// Copy the complete independent evaluator; keep batch proof lifetime local.
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
const marker='\n// GENERATED: bounded independent owned-core batch evaluation.\n';
const fail=message=>{throw TypeError('Owned batch evaluator source: '+message);};
function derive(source){
 const ts=ownershipCompiler(),file=ts.createSourceFile('owned-core-operations.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),selected=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='evaluateOwnedCoreProgram');
 if(file.parseDiagnostics.length||selected.length!==1)fail('one complete native evaluator required');
 const fn=selected[0],start=fn.getStart(file),before=fn.getText(file),parameters=fn.parameters;
 if(parameters.map(node=>node.getText(file)).join(',')!=='input,name,args,token'||fn.body.statements.length<3)fail('original evaluator signature differs');
 const prefix=fn.body.statements.slice(0,2).map(node=>node.getText(file)).join('\n ');
 if(prefix!=="const program=checkOwnedCoreProgram(input),state=runtimes.get(token);\n if(!state||!isDeepStrictEqual(state.program,program))fail('unissued runtime/program');")fail('complete original source/token admission differs');
 const edits=[
  {start:0,end:7,before:'export ',after:''},
  {start:fn.name.getStart(file)-start,end:fn.name.end-start,before:fn.name.text,after:'evaluateOwnedCorePrepared'},
  {start:parameters[0].getStart(file)-start,end:parameters.at(-1).end-start,before:'input,name,args,token',after:'program,name,args,state'},
  {start:fn.body.statements[0].getFullStart()-start,end:fn.body.statements[1].end-start,before:source.slice(fn.body.statements[0].getFullStart(),fn.body.statements[1].end),after:''},
 ];
 let copy=before,last=copy.length;
 for(const edit of edits.sort((a,b)=>b.start-a.start)){if(edit.end>last||copy.slice(edit.start,edit.end)!==edit.before)fail('complete selected native span differs');copy=copy.slice(0,edit.start)+edit.after+copy.slice(edit.end);last=edit.start;}
 const batch=`export function evaluateOwnedCoreBatch(input,calls,token){
 if(!originalNamespaceTraversalIntrinsicsUnchanged()||!originalStaticSourceIntrinsicsUnchanged())fail('batch requires original host operations');
 ${prefix}
 if(!program.length)fail('batch requires an issued nonempty program');
 const array=(value,bound)=>{
  if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('batch requires ordinary dense arrays');
  const fields=Object.getOwnPropertyDescriptors(value),length=fields.length;
  if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<0||length.value>bound||Reflect.ownKeys(fields).length!==length.value+1)fail('batch array bound or fields differ');
  const result=[];for(let at=0;at<length.value;at++){const field=fields[at];if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('batch array data differs');result.push(field.value);}return result;
 };
 const requests=array(calls,4096).map(value=>{const pair=array(value,2);if(pair.length!==2||typeof pair[0]!=='string'||pair[0].length>128)fail('batch call pair differs');return [pair[0],array(pair[1],64)];});
 const context=issued.get(program[0]).context,results=[];
 for(const [name,args]of requests){
  requireOwnedCoreSourceCurrent(context);let failed=false;
  try{results.push(evaluateOwnedCorePrepared(program,name,args,state));}
  catch(error){failed=true;throw error;}
  finally{try{requireOwnedCoreSourceCurrent(context);}catch(error){if(!failed)throw error;}}
 }
 return results;
}`;
 const suffix=marker+copy+'\n\n'+batch+'\n',after=source+suffix,parsed=ts.createSourceFile('owned-core-operations.mjs',after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(parsed.parseDiagnostics.length)fail('complete generated native syntax differs');return {after,suffix,original:before,copy,prefix,edits};
}
export function addOwnedCoreBatchSource(source){if(source.includes(marker))fail('batch source already installed');return derive(source).after;}
export function removeOwnedCoreBatchSource(source){const at=source.indexOf(marker);if(at<0)return source;if(source.indexOf(marker,at+1)!==-1)fail('ambiguous complete batch source');const before=source.slice(0,at);if(derive(before).after!==source)fail('complete original evaluator copy or batch source changed');return before;}
