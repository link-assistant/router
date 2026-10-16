// Generate exact registered birth-source proposals; never execute generated code.
// This tool is a reviewed source transformer, not a public proof/owner issuer.
// Runtime birth joins assume authentic initialization of the13 owned ESM
// modules. Later file hashes cannot establish that historical fact.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {createRequire} from 'node:module';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {independentParserSha256} from './private-parser-sha256.mjs';
import {originalClassBirthSourceHostAvailable,originalClassDefinitionProgram} from './extensions/original-class-definition-birth.mjs';
import {throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const INPUTS=[{"path":"tools/translation/extensions/core.mjs","bytes":5445,"sha256":"614186ac1d6f4aaf4032a7177a7181e86c045ceed82f271e7dd3c86bb1013fde"},{"path":"tools/translation/extensions/strings.mjs","bytes":21432,"sha256":"0059f8cfe933e70bfb2b3fd0303e7b79b8c0dbf05d07f697b9c7d8fba61e94d0"},{"path":"tools/translation/extensions/control.mjs","bytes":24440,"sha256":"56f79ae0b17a1af1373eb4b6d9027e95a2eb8e44baf487c4786b9f3bdfaa1f78"},{"path":"tools/translation/extensions/pattern-control.mjs","bytes":52588,"sha256":"e2c956545d40914f030aea34b0bfcb83f8f99d5fbaade9b2ed93763ff54c5fee"},{"path":"tools/translation/extensions/tuples.mjs","bytes":11893,"sha256":"e021dc4d3da61ad2934e2417964ee0ad05552519eaa361858fbf3c79aab9c562"},{"path":"tools/translation/extensions/formatting.mjs","bytes":12475,"sha256":"8516551af90045eb3d3fb782ecf3385a1e97047a0d55be9a8f475702bd6978d9"},{"path":"tools/translation/extensions/text.mjs","bytes":16505,"sha256":"8b7b5314e8e4d167a014fbf83621ce7f9e6cae0a2dcf1bf2336aab484e55d489"},{"path":"tools/translation/extensions/data.mjs","bytes":25677,"sha256":"cdff23e421482de48c58c76e349138dc8929707dbb896ad55e63fe82cdfa7879"},{"path":"tools/translation/extensions/iterators.mjs","bytes":38108,"sha256":"64105f16c3b9386a707299d558929acab9258552a1de64be9e86c7979bf91581"},{"path":"tools/translation/extensions/effects.mjs","bytes":14080,"sha256":"71e2d20d4e31044c5da3a184ce4c479d52630f0b389e8538cc03848303ab3d57"},{"path":"tools/translation/extensions/methods.mjs","bytes":6090,"sha256":"eaf8bf1fa59f2833a50596953e18e361c9e5b4e155d911be8a3433bb2dd658f7"},{"path":"tools/translation/extensions/parameter-patterns.mjs","bytes":3501,"sha256":"3a14b8c4c16fbfed358e670c553e76db972de9d88e1dd98b622d04468ffa9aa1"},{"path":"tools/translation/extensions/standard-string-equality.mjs","bytes":5352,"sha256":"bc11e355163b0f3617c6a3e4e8ccb042cf92f993d97d4c407ba1d55a1940cdfe"},{"path":"tools/translation/vendor/meta-language/translation/rust.js","bytes":37095,"sha256":"46775f6787eea0e89faccaf1bbc55a21912410682fc7d93dce1583e690d7d332"},{"path":"tools/translation/vendor/meta-language/translation/check.js","bytes":75207,"sha256":"14544917cda1bd3c6c129629c7a99710d1d8b72194bcd8116a373f66721c2232"},{"path":"tools/translation/vendor/meta-language/LICENSE","bytes":1211,"sha256":"6b0382b16279f26ff69014300541967a356a666eb0b91b422f6862f6b7dad17e"},{"path":"tools/translation/vendor/NOTICE.md","bytes":2076,"sha256":"827d7d26ecc3da802b161c955fb78bec7ba1845969d28461d3ef951b6e70d34e"},{"path":"tools/translation/vendor/upstream-lock.json","bytes":3043,"sha256":"ee126e234437d23b62fefa4f4c6b59baa09f89918613412570d32bfd652a50c1"},{"path":"tools/translation/extensions/host-contracts.mjs","bytes":111456,"sha256":"009c47a1e6efb17e268f055f6b26116c8db47d788a3ed10f0508b1449ae21271"}];
const DEFINITIONS=[{"id":"RustParser","module":"core","path":"tools/translation/vendor/meta-language/translation/rust.js","factory":null,"className":"RustParser","parent":null},{"id":"Checker","module":"core","path":"tools/translation/vendor/meta-language/translation/check.js","factory":null,"className":"Checker","parent":null},{"id":"StringRustParser","module":"strings","path":"tools/translation/extensions/strings.mjs","factory":null,"className":"StringRustParser","parent":"RustParser"},{"id":"StringChecker","module":"strings","path":"tools/translation/extensions/strings.mjs","factory":null,"className":"StringChecker","parent":"Checker"},{"id":"ControlRustParser","module":"control","path":"tools/translation/extensions/control.mjs","factory":null,"className":"ControlRustParser","parent":"StringRustParser"},{"id":"ControlChecker","module":"control","path":"tools/translation/extensions/control.mjs","factory":null,"className":"ControlChecker","parent":"StringChecker"},{"id":"PatternControlRustParser","module":"pattern-control","path":"tools/translation/extensions/pattern-control.mjs","factory":"withPatternControlParser","className":null,"parent":"ControlRustParser"},{"id":"PatternControlChecker","module":"pattern-control","path":"tools/translation/extensions/pattern-control.mjs","factory":"withPatternControlChecker","className":null,"parent":"ControlChecker"},{"id":"TupleRustParser","module":"tuples","path":"tools/translation/extensions/tuples.mjs","factory":null,"className":"TupleRustParser","parent":"ParameterPatternRustParser"},{"id":"TupleChecker","module":"tuples","path":"tools/translation/extensions/tuples.mjs","factory":null,"className":"TupleChecker","parent":"PatternControlChecker"},{"id":"FormatRustParser","module":"formatting","path":"tools/translation/extensions/formatting.mjs","factory":null,"className":"FormatRustParser","parent":"TupleRustParser"},{"id":"FormatChecker","module":"formatting","path":"tools/translation/extensions/formatting.mjs","factory":null,"className":"FormatChecker","parent":"TupleChecker"},{"id":"TextRustParser","module":"text","path":"tools/translation/extensions/text.mjs","factory":null,"className":"TextRustParser","parent":"FormatRustParser"},{"id":"TextChecker","module":"text","path":"tools/translation/extensions/text.mjs","factory":null,"className":"TextChecker","parent":"FormatChecker"},{"id":"DataRustParser","module":"data","path":"tools/translation/extensions/data.mjs","factory":null,"className":"DataRustParser","parent":"TextRustParser"},{"id":"DataChecker","module":"data","path":"tools/translation/extensions/data.mjs","factory":null,"className":"DataChecker","parent":"StandardStringEqualityChecker"},{"id":"IteratorRustParser","module":"iterators","path":"tools/translation/extensions/iterators.mjs","factory":null,"className":"IteratorRustParser","parent":"DataRustParser"},{"id":"IteratorChecker","module":"iterators","path":"tools/translation/extensions/iterators.mjs","factory":null,"className":"IteratorChecker","parent":"DataChecker"},{"id":"EffectRustParser","module":"effects","path":"tools/translation/extensions/effects.mjs","factory":null,"className":"EffectRustParser","parent":"IteratorRustParser"},{"id":"EffectChecker","module":"effects","path":"tools/translation/extensions/effects.mjs","factory":null,"className":"EffectChecker","parent":"IteratorChecker"},{"id":"MethodRustParser","module":"methods","path":"tools/translation/extensions/methods.mjs","factory":null,"className":"MethodRustParser","parent":"EffectRustParser"},{"id":"MethodChecker","module":"methods","path":"tools/translation/extensions/methods.mjs","factory":null,"className":"MethodChecker","parent":"EffectChecker"},{"id":"ParameterPatternRustParser","module":"parameter-patterns","path":"tools/translation/extensions/parameter-patterns.mjs","factory":"withParameterPatternParser","className":null,"parent":"PatternControlRustParser"},{"id":"StandardStringEqualityChecker","module":"standard-string-equality","path":"tools/translation/extensions/standard-string-equality.mjs","factory":"withStandardStringEqualityChecker","className":"StandardStringEqualityChecker","parent":"TextChecker"}];
const MODULES=["core","strings","control","pattern-control","tuples","formatting","text","data","iterators","effects","methods","parameter-patterns","standard-string-equality"];
const BEGIN='// BEGIN REGISTERED CLASS BIRTH PROGRAM',END='// END REGISTERED CLASS BIRTH PROGRAM';
let prepared=null;
function fail(message){throwOriginalCapturedTypeError('Original class birth source tool: '+message);}
function checked(){if(!originalClassBirthSourceHostAvailable())fail('genuine stock host unavailable');}
function hash(source){const h=createHash('sha256');checked();const updated=h.update(source);checked();const result=updated.digest('hex');checked();if(typeof result!=='string'||result!==independentParserSha256(source))fail('independent complete source digest differs');checked();return result;}
function utf8Bytes(text){let count=0;for(let at=0;at<text.length;at++){let code=text.charCodeAt(at);if(code>=55296&&code<=56319){const low=text.charCodeAt(++at);if(!(low>=56320&&low<=57343))fail('unpaired source surrogate');code=65536+(code-55296)*1024+low-56320;}else if(code>=56320&&code<=57343)fail('unpaired source surrogate');count+=code<128?1:code<2048?2:code<65536?3:4;}return count;}
function pin(source){return {bytes:utf8Bytes(source),sha256:hash(source)};}
function exact(source,before,after){const start=source.indexOf(before);if(start<0||source.indexOf(before,start+1)!==-1)fail('unique original anchor differs');return {start,end:start+before.length,expected:before,replacement:after};}
export function applyOriginalClassBirthEdits(source,edits){
  let at=0,position=0;const parts=[],reverse=[];
  for(let index=0;index<edits.length;index++){const edit=edits[index];if(edit.start<at||edit.end<edit.start||source.slice(edit.start,edit.end)!==edit.expected)fail('complete original edit boundary differs');const before=source.slice(at,edit.start);parts.push(before,edit.replacement);position+=before.length;reverse.push({start:position,end:position+edit.replacement.length,expected:edit.replacement,replacement:edit.expected});position+=edit.replacement.length;at=edit.end;}
  parts.push(source.slice(at));const value=parts.join('');let restored=value;
  for(let index=reverse.length-1;index>=0;index--){const edit=reverse[index];if(restored.slice(edit.start,edit.end)!==edit.expected)fail('reverse boundary differs');restored=restored.slice(0,edit.start)+edit.replacement+restored.slice(edit.end);}
  if(restored!==source)fail('whole source reverse differs');return {value,reverse};
}
function parse(ts,path,text){const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original JavaScript grammar refused');return file;}
function arity(parameters){let result=0;for(let at=0;at<parameters.length;at++){const p=parameters[at];if(p.initializer||p.dotDotDotToken)break;result++;}return result;}
function functionNode(ts,file,name){const selected=[];for(let at=0;at<file.statements.length;at++){const node=file.statements[at];if(ts.isFunctionDeclaration(node)&&node.name?.text===name)selected.push(node);}if(selected.length!==1)fail('unique whole function required');return selected[0];}
function select(ts,file,text,spec){
  let node,returned=null,factoryBodyStart=null;
  if(spec.factory){const fn=functionNode(ts,file,spec.factory);factoryBodyStart=fn.body?fn.body.getStart(file)+1:null;if(!fn.body)fail('complete factory body required');const candidates=[];
    for(let at=0;at<fn.body.statements.length;at++){const statement=fn.body.statements[at];if(ts.isReturnStatement(statement)&&statement.expression&&ts.isClassExpression(statement.expression))candidates.push(statement);}
    if(candidates.length!==1)fail('unique direct returned class required');returned=candidates[0];node=returned.expression;
  }else{const selected=[];for(let at=0;at<file.statements.length;at++){const item=file.statements[at];if(ts.isClassDeclaration(item)&&item.name?.text===spec.className)selected.push(item);}if(selected.length!==1)fail('unique whole class required');node=selected[0];}
  const decorators=ts.canHaveDecorators(node)?ts.getDecorators(node):undefined;
  if(node.typeParameters||decorators?.length||node.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword))fail('unsupported class declaration grammar');
  const className=node.name?.text??'';if(className!==(spec.className??''))fail('original class name differs');
  const clauses=node.heritageClauses??[];if(clauses.length>1)fail('unsupported heritage clauses');let superText=null;
  if(clauses.length){if(clauses[0].token!==ts.SyntaxKind.ExtendsKeyword||clauses[0].types.length!==1||clauses[0].types[0].typeArguments?.length)fail('one actual superclass required');superText=clauses[0].types[0].expression.getText(file);}
  if(spec.parent===null?superText!==null:superText===null)fail('root/superclass grammar differs');if(spec.factory&&superText!=='Base')fail('exact factory Base grammar differs');
  const methods=[{key:'constructor',length:0,implicit:true}],privateMethods=[],spans=[];let constructorSeen=false;
  for(let at=0;at<node.members.length;at++){
    const member=node.members[at];
    function rejectMember(reason){fail(reason+': '+JSON.stringify({classId:spec.id,path:spec.path,start:member.getStart(file),end:member.end,utf8Start:utf8Bytes(text.slice(0,member.getStart(file))),utf8End:utf8Bytes(text.slice(0,member.end)),kind:ts.SyntaxKind[member.kind],name:member.name?.getText(file)??null,source:member.getText(file)}));}
    if(member.modifiers?.length||member.questionToken||member.type||!member.body)rejectMember('unsupported complete class element');
    let key,kind,methodArity;
    if(ts.isConstructorDeclaration(member)){if(constructorSeen)rejectMember('duplicate constructor');constructorSeen=true;key='constructor';kind='constructor';methodArity=arity(member.parameters);methods[0]={key,length:methodArity,implicit:false};}
    else if(ts.isMethodDeclaration(member)&&!member.asteriskToken&&!member.typeParameters){
      methodArity=arity(member.parameters);
      if(ts.isPrivateIdentifier(member.name)){key=member.name.getText(file);kind='private-instance-ordinary-method';if(privateMethods.some(m=>m.key===key))rejectMember('ambiguous original private member');}
      else{kind='public-instance-ordinary-method';if(ts.isIdentifier(member.name)||ts.isStringLiteral(member.name)||ts.isNumericLiteral(member.name))key=member.name.text;else rejectMember('unsupported class member name');
        if(key==='constructor'||methods.some(m=>m.key===key))rejectMember('ambiguous original member key');methods.push({key,length:methodArity,implicit:false});}
    }else rejectMember('unsupported class member grammar');
    const start=member.getStart(file),end=member.end,span={key,kind,nodeKind:ts.SyntaxKind[member.kind],arity:methodArity,start,end,utf8Start:utf8Bytes(text.slice(0,start)),utf8End:utf8Bytes(text.slice(0,end)),source:text.slice(start,end),...pin(text.slice(start,end))};spans.push(span);
    // Private ordinary methods remain lexical class source only. They have no
    // public prototype field and no function reference is exposed or invoked.
    if(kind==='private-instance-ordinary-method')privateMethods.push(span);
  }
  const start=node.getStart(file),end=node.end,source=text.slice(start,end);if(node.getText(file)!==source)fail('whole original class span differs');
  const id=spec.id,slot='__routerOriginalBirth286_'+id,local='__routerOriginalReturned286_'+id,counter='__routerOriginalFactoryCalls286_'+id;
  if(text.includes(slot)||text.includes(local)||text.includes(counter)||text.includes('originalClassDefinitionBirths'))fail('birth identifier collision');
  const constructorLength=constructorSeen?methods[0].length:spec.parent===null?0:0;
  return {...spec,inlineFactory:spec.id==='TupleRustParser'||spec.id==='DataChecker',factoryBodyStart,counter,name:className,length:constructorLength,methods,privateMethods,superText,start,end,source,sourcePin:pin(source),memberSpans:spans,returned:returned?{start:returned.getStart(file),end:returned.end,source:returned.getText(file)}:null,slot,local};
}
function tuple(definition,ctor){return '['+ctor+','+ctor+'.prototype,'+(definition.inlineFactory?'null':definition.superText??'null')+',['+definition.methods.map(m=>'['+JSON.stringify(m.key)+','+(m.key==='constructor'?ctor:ctor+'.prototype['+JSON.stringify(m.key)+']')+']').join(',')+']]';}
function copyTuple(slot,count){return slot+'?['+slot+'[0],'+slot+'[1],'+slot+'[2],['+Array.from({length:count},(_,at)=>'['+slot+'[3]['+at+'][0],'+slot+'[3]['+at+'][1]]').join(',')+']]:null';}
function observer(definitions,bindings='[]'){return '\nexport function originalClassDefinitionBirths(){return {records:['+definitions.map(d=>copyTuple(d.slot,d.methods.length)).join(',')+'],bindings:'+bindings+',factoryCalls:['+definitions.map(d=>d.factory?'('+d.counter+'===undefined?0:'+d.counter+')':'0').join(',')+']};}\n';}
function moduleEdits(definitions,text){
  const edits=[],vars=[];
  for(let at=0;at<definitions.length;at++){
    const d=definitions[at];if(d.factory){vars.push(d.slot,d.counter);edits.push({start:d.factoryBodyStart,end:d.factoryBodyStart,expected:'',replacement:'\n  '+d.counter+'='+d.counter+'===undefined?1:2;\n'});edits.push({start:d.returned.start,end:d.start,expected:text.slice(d.returned.start,d.start),replacement:'const '+d.local+'=(function(item){return item;})('});edits.push({start:d.end,end:d.returned.end,expected:text.slice(d.end,d.returned.end),replacement:');\n  if('+d.slot+'===undefined)'+d.slot+'='+tuple(d,d.local)+';\n  return '+d.local+';'});}
    else{edits.push({start:d.end,end:d.end,expected:'',replacement:'\nconst '+d.slot+'='+tuple(d,d.className)+';\n'});}
  }
  if(vars.length)edits.push({start:0,end:0,expected:'',replacement:'// Hoisted undefined slots do not add a module lexical TDZ. Never overwritten.\nvar '+vars.join(',')+';\n'});
  edits.push({start:text.length,end:text.length,expected:'',replacement:observer(definitions)});edits.sort((a,b)=>a.start-b.start);return edits;
}
function oldCoreReplacements(ts,file,text){
  const result={};for(let at=0;at<file.statements.length;at++){const s=file.statements[at];if(!ts.isVariableStatement(s))continue;
    for(let i=0;i<s.declarationList.declarations.length;i++){let call=s.declarationList.declarations[i].initializer;if(ts.isAwaitExpression(call))call=call.expression;if(!call||!ts.isCallExpression(call)||call.expression.getText(file)!=='exposed')continue;
      const [name,rows]=call.arguments;if(!ts.isStringLiteral(name)||!ts.isArrayLiteralExpression(rows))fail('exact original exposure table required');const list=[];
      for(let index=0;index<rows.elements.length;index++){const row=rows.elements[index];if(!ts.isArrayLiteralExpression(row)||row.elements.length!==3||!row.elements.every(x=>ts.isStringLiteral(x)))fail('literal exact source recipe required');list.push({id:row.elements[0].text,expected:row.elements[1].text,replacement:row.elements[2].text});}
      result[name.text]={call,rows,list};
    }
  }if(!result['rust.js']||!result['check.js'])fail('complete two original exposure tables required');return result;
}
function repoImports(ts,text,path){
  const file=parse(ts,path,text),rows=[];for(let at=0;at<file.statements.length;at++){const node=file.statements[at];if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier))continue;const name=node.moduleSpecifier.text;if(!name.startsWith('./')&&!name.startsWith('../'))continue;
    rows.push({start:node.moduleSpecifier.getStart(file),end:node.moduleSpecifier.end,expected:node.moduleSpecifier.getText(file),target:name==='./types.js'?'checked-types.mjs':'vendor/meta-language/translation/'+name.slice(2)});
  }return rows;
}
function coreLanguagePlan(ts,text,originals){
  const file=parse(ts,'core.mjs',text),tables=oldCoreReplacements(ts,file,text),edits=[],core=[];
  const names=['rust.js','check.js'];for(let at=0;at<names.length;at++){
    const name=names[at],table=tables[name];let normalized=originals[name];for(let index=0;index<table.list.length;index++){const x=table.list[index];normalized=applyOriginalClassBirthEdits(normalized,[exact(normalized,x.expected,x.replacement)]).value;}
    const spec=DEFINITIONS.find(d=>d.module==='core'&&d.path.endsWith('/'+name)),definition=select(ts,parse(ts,name,normalized),normalized,spec);
    // A selected whole class licenses the insertion; the minimal unique suffix
    // is only the exact substitution anchor, never evidence omitting the body.
    let size=Math.min(80,definition.source.length),anchor;for(;;){anchor=definition.source.slice(-size);if(normalized.indexOf(anchor)===normalized.lastIndexOf(anchor))break;if(size===definition.source.length)fail('unique class-end anchor absent');size=Math.min(definition.source.length,size+80);}
    const birth='\nconst '+definition.slot+'='+tuple(definition,definition.className)+';\n'+observer([definition]);const language={id:'original-class-birth-'+definition.id,expected:anchor,replacement:anchor+birth};
    const rawArray=table.rows.getText(file),close=table.rows.end-1;edits.push({start:close,end:close,expected:'',replacement:'\n  '+JSON.stringify([language.id,language.expected,language.replacement])+',\n'});
    const withBirth=applyOriginalClassBirthEdits(normalized,[exact(normalized,language.expected,language.replacement)]).value;
    core.push({name,original:pin(originals[name]),language:[...table.list,language],repository:repoImports(ts,withBirth,name),definition});
  }
  return {edits,core};
}
function coreRepositoryEdits(ts,text){
  const file=parse(ts,'core.mjs',text),edits=[],names=['rust.js','check.js'];
  const exposed=functionNode(ts,file,'exposed'),body=exposed.body.getText(file);
  const before="  const source=pipeline.run(readFileSync(url,'utf8')).value;\n  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));";
  const after="  const original=readFileSync(url,'utf8');\n  const binding=captureOriginalClassSource(name,original);\n  const source=pipeline.run(original).value;\n  const encoded='data:text/javascript;base64,' + Buffer.from(source).toString('base64');\n  if(binding){requireOriginalClassSourceURL(binding,name,source,encoded);__routerCoreSourceBindings286[name]=binding;}\n  return import(encoded);";
  if(!body.includes(before))fail('exact original core execution boundary differs');edits.push(exact(text,before,after));
  edits.push({start:0,end:0,expected:'',replacement:"import {captureOriginalClassSource,requireOriginalClassSourceURL} from './original-class-definition-birth.mjs';\nconst __routerCoreSourceBindings286={__proto__:null};\n"});
  for(const name of names){
    const binding=name==='rust.js'?'RustParser':'Checker',local='__routerCoreNamespace286_'+binding;
    const before='export const { '+binding+' } = await exposed(';
    const first=text.indexOf(before);if(first<0||text.indexOf(before,first+1)!==-1)fail('exact core canonical binding differs');
    const node=file.statements.find(s=>s.getStart(file)===first);if(!node)fail('whole core exposure statement absent');
    edits.push({start:first,end:first+before.length,expected:before,replacement:'const '+local+'=await exposed('});
    edits.push({start:node.end,end:node.end,expected:'',replacement:'\nexport const { '+binding+' }='+local+';'});
  }
  const filtered=edits;
  const exportBody="\nexport function originalClassDefinitionBirths(){\n  if(!__routerCoreSourceBindings286['rust.js']||!__routerCoreSourceBindings286['check.js'])return null;\n  const parser=__routerCoreNamespace286_RustParser.originalClassDefinitionBirths(),checker=__routerCoreNamespace286_Checker.originalClassDefinitionBirths();\n  return {records:[parser.records[0],checker.records[0]],bindings:[__routerCoreSourceBindings286['rust.js'],__routerCoreSourceBindings286['check.js']],factoryCalls:[0,0]};\n}\n";
  filtered.push({start:text.length,end:text.length,expected:'',replacement:exportBody});filtered.sort((a,b)=>a.start-b.start);return filtered;
}
export function prepareOriginalClassBirthPlan({sourceRoot=resolve(fileURLToPath(new URL('../../',import.meta.url)))}={}){
  checked();const root=resolve(sourceRoot),require=createRequire(join(process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??root,'packages/javascript/package.json')),ts=require('typescript');if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');checked();
  const installedText=originalClassDefinitionProgram(),installed=installedText?JSON.parse(installedText):null;checked();const originals={};
  for(let at=0;at<INPUTS.length;at++){const row=INPUTS[at];let source=readFileSync(join(root,row.path),'utf8');checked();let digest=hash(source);
    if(digest!==row.sha256&&installed){const old=installed.files.find(x=>'tools/translation/'+x.path===row.path);if(old&&digest===old.after.sha256){for(let index=old.reverse.length-1;index>=0;index--){const edit=old.reverse[index];if(source.slice(edit.start,edit.end)!==edit.expected)fail('installed source reverse differs');source=source.slice(0,edit.start)+edit.replacement+source.slice(edit.end);}digest=hash(source);}}
    if(digest!==row.sha256||utf8Bytes(source)!==row.bytes)fail('complete pinned original differs: '+row.path);originals[row.path]=source;
  }
  // The language rule produces a closed exact edit representation from full
  // parsed classes. The repository rule consumes that representation, adds the
  // fixed core URL/binding edits, materializes/reparses all source, and packages
  // the private manifest. The returned trace is the actual runner trace.
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'select-complete-classes-and-plan-lexical-births',apply(input){
      const plans=[],definitions=[];let coreRows=[];
      for(let at=0;at<MODULES.length;at++){
        const id=MODULES[at],path='tools/translation/extensions/'+id+'.mjs',source=input[path];let selected=[],edits;
        if(id==='core'){const result=coreLanguagePlan(ts,source,{'rust.js':input['tools/translation/vendor/meta-language/translation/rust.js'],'check.js':input['tools/translation/vendor/meta-language/translation/check.js']});edits=result.edits;coreRows=result.core;selected=result.core.map(r=>r.definition);}
        else{const specs=DEFINITIONS.filter(d=>d.module===id),file=parse(ts,path,source);selected=specs.map(spec=>select(ts,file,source,spec));edits=moduleEdits(selected,source);}
        definitions.push(...selected);plans.push({id,path,source,selected,edits});
      }
      if(definitions.length!==24)fail('all24 complete class definitions required');return {plans,definitions,coreRows};
    }}]},
    {phase:'repository',rules:[{id:'bind-core-urls-materialize-sources-and-package-program',apply(state){
      const {definitions,coreRows}=state,modules=[],files=[];
      for(let at=0;at<state.plans.length;at++){
        const row=state.plans[at],edits=row.id==='core'?[...row.edits,...coreRepositoryEdits(ts,row.source)].sort((a,b)=>a.start-b.start):row.edits;
        const transformed=applyOriginalClassBirthEdits(row.source,edits);parse(ts,row.path,transformed.value);
        modules.push({id:row.id,file:'./'+row.id+'.mjs',definitions:row.selected.map(d=>d.id)});files.push({path:row.path.slice('tools/translation/'.length),before:pin(row.source),after:pin(transformed.value),edits,reverse:transformed.reverse,beforeSource:row.source,afterSource:transformed.value});
      }
      const entryPath='tools/translation/extensions/host-contracts.mjs',entry={path:'extensions/host-contracts.mjs',sourcePin:pin(originals[entryPath])};
      const program={schema:'registered-original-class-birth-v1',entry,sourceDomain:{ownedEsmBootstrap:'trusted prerequisite; historical cached evaluation is not authenticated by current file hashes',coreRawDynamicSource:'additional early exact raw source/transformation/dataURL binding',partBAnd265:'not authorized by A1'},modules,definitions:definitions.map(d=>({id:d.id,parent:d.parent,factory:!!d.factory,inlineFactory:d.inlineFactory,name:d.name,length:d.length,methods:d.methods,privateMethods:d.privateMethods.map(({source,...span})=>span),sourcePin:d.sourcePin,wholeSpan:{start:d.start,end:d.end},memberSpans:d.memberSpans.map(({source,...span})=>span)})),files:files.map(({beforeSource,afterSource,...row})=>row),core:coreRows.map(({definition,...row})=>row),authority:{type:false,owner:false,cfg:false,body:false,executable:false}};
      const leafPath='tools/translation/extensions/original-class-definition-birth.mjs',leaf=readFileSync(join(root,leafPath),'utf8');checked();const start=leaf.indexOf(BEGIN),end=leaf.indexOf(END);if(start<0||end<start||leaf.indexOf(BEGIN,start+1)!==-1||leaf.indexOf(END,end+1)!==-1)fail('exact private program marker required');
      const text=JSON.stringify(program),generated=leaf.slice(0,start)+BEGIN+'\nconst PROGRAM='+text+';\n'+leaf.slice(end);if(utf8Bytes(generated)>262144)fail('generated leaf exceeds its upfront262144-byte source-authentication bound');parse(ts,leafPath,generated);
      checked();return {schema:'original-class-birth-source-proposal-v1',sourceRoot:root,files,leaf:{path:leafPath,beforeSource:leaf,afterSource:generated,before:pin(leaf),after:pin(generated)},program,selections:definitions,authority:{type:false,owner:false,executable:false}};
    }}]},
  ]);
  const outcome=pipeline.run(originals);checked();const trace=[];
  for(let at=0;at<outcome.trace.length;at++){const row=outcome.trace[at];trace.push({phase:row.phase,id:row.id});}
  const result={...outcome.value,trace};
  const snapshot=JSON.parse(JSON.stringify(result));checked();if(!prepared)prepared=new WeakMap();prepared.set(result,snapshot);return result;
}
function sameData(left,right,budget={cells:500000},depth=0){
  if(--budget.cells<0||depth>64)return false;if(left===right)return true;if(!left||!right||typeof left!=='object'||typeof right!=='object'||types.isProxy(left)||types.isProxy(right))return false;
  if(Object.getPrototypeOf(left)!==Object.getPrototypeOf(right))return false;const names=Reflect.ownKeys(left),other=Reflect.ownKeys(right);if(names.length!==other.length)return false;
  for(let at=0;at<names.length;at++){const key=names[at];if(key!==other[at])return false;const a=Object.getOwnPropertyDescriptor(left,key),b=Object.getOwnPropertyDescriptor(right,key);if(!a||!b||!Object.hasOwn(a,'value')||!Object.hasOwn(b,'value')||a.enumerable!==b.enumerable||a.configurable!==b.configurable||a.writable!==b.writable||!sameData(a.value,b.value,budget,depth+1))return false;}return true;
}
export function writeOriginalClassBirthProposal(plan,directory){
  checked();if(!prepared||!plan||typeof plan!=='object'||types.isProxy(plan))fail('genuine source proposal required');const snapshot=prepared.get(plan);if(!snapshot||!sameData(plan,snapshot))fail('copied or changed source proposal');
  if(typeof directory!=='string'||directory.length>4096)fail('bounded output directory required');const output=resolve(directory);if(output===snapshot.sourceRoot||output.startsWith(snapshot.sourceRoot+'/'))fail('proposal output must be outside the source root');mkdirSync(output,{recursive:false});const rows=[...snapshot.files,snapshot.leaf];
  for(let at=0;at<rows.length;at++){const row=rows[at],path=row.path.startsWith('tools/')?row.path:'tools/translation/'+row.path;const versions=[['before',row.beforeSource],['after',row.afterSource]];for(let index=0;index<versions.length;index++){const kind=versions[index][0],text=versions[index][1],target=join(output,kind,path);mkdirSync(dirname(target),{recursive:true});checked();writeFileSync(target,text,{flag:'wx'});checked();}}
  writeFileSync(join(output,'complete-source-proposal.json'),JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});checked();return output;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(args.length!==5||args[0]!=='--plan'||args[1]!=='--root'||args[3]!=='--output')fail('usage: --plan --root SOURCE --output FRESH_OUTSIDE_CASE_DIRECTORY');
  writeOriginalClassBirthProposal(prepareOriginalClassBirthPlan({sourceRoot:args[2]}),args[4]);
}
