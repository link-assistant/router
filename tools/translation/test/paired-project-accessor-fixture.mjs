// Receiving source DATA only. Each loaded copy keeps its own private issuers.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedModuleBindings} from '../source-copy-native-bindings.mjs';
import {transportConcreteNamedSourcePhases} from '../concrete-sequential-phases.mjs';
import {relocateSourceModule} from './relocate-source-module.mjs';
const origin=new URL('../project.mjs',import.meta.url),fixture=new URL('../fixtures/project-before-rule-pipeline-000151.mjs.txt',import.meta.url);
const fail=message=>{throw new TypeError('Paired project accessor fixture: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const one=(rows,label)=>{if(rows.length!==1)fail('one original '+label+' required');return rows[0];};
function parse(ts,source){
 if(typeof source!=='string'||Buffer.byteLength(source)>262144)fail('bounded complete source required');
 const file=ts.createSourceFile(origin.href,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('complete native source grammar differs');return file;
}
function predecessor(){
 const base=new URL('../source-profiles/project-facade-retention/',import.meta.url),manifest=readFileSync(new URL('manifest.json',base));
 if(hash(manifest)!=='435847f54eceedb2506b10cac8cfab73e44a81f75b5044952792a920eaba3b3e')fail('complete accessor manifest differs');
 const row=JSON.parse(manifest),packed=readFileSync(new URL(row.archive,base));
 if(packed.length!==row.archiveBytes||hash(packed)!==row.archiveSha256)fail('complete accessor archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:262144});
 if(raw.length!==row.bytes||hash(raw)!==row.sha256)fail('whole accessor predecessor differs');
 const source=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw);
 if(hash(source)!==row.sha256)fail('whole predecessor UTF8 differs');return {...row,source};
}
export function derivePairedProjectAccessorFixture(before,current){
 if(typeof before!=='string'||hash(before)!=='f9ea0ff4818f913f3384a7053c0eda24149420aedab6711f0dd08ca8f69561e0')fail('complete frozen baseline differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const historical=predecessor(),old=parse(ts,before),actual=parse(ts,current),birth=parse(ts,historical.source),accessors=[];
 function visit(node){if(ts.isPropertyAssignment(node)&&node.name.getText(birth)==='checkedSource')accessors.push(node);ts.forEachChild(node,visit);}visit(birth);
 const accessor=one(accessors,'authenticated accessor').initializer;
 if(!ts.isArrowFunction(accessor)||accessor.parameters.length)fail('original accessor callable differs');
 const helper=one(actual.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createProjectCheckedSource'),'current complete accessor helper');
 const expected='function createProjectCheckedSource(checked,graph,entry){const facade={checkedSource:'+accessor.getText(birth)+'};return facade.checkedSource;}';
 if(helper.getText(actual)!==expected)fail('whole current accessor helper differs');
 const carriers=[];function select(node){if(ts.isVariableDeclaration(node)&&node.name.getText(old)==='executableDeclarations')carriers.push(node);if(ts.isIdentifier(node)&&node.text==='createProjectCheckedSource')fail('baseline already contains receiving helper');ts.forEachChild(node,select);}select(old);
 const call=one(carriers,'baseline declaration carrier').initializer,arrow=call?.arguments?.[0];
 if(!ts.isCallExpression(call)||call.expression.getText(old)!=='entries.map'||call.arguments.length!==1||!ts.isArrowFunction(arrow)||arrow.parameters.length!==1||arrow.parameters[0].name.getText(old)!=='entry'||!ts.isParenthesizedExpression(arrow.body)||!ts.isObjectLiteralExpression(arrow.body.expression))fail('original baseline carrier differs');
 const object=arrow.body.expression;
 if(JSON.stringify(object.properties.map(node=>node.name?.getText(old)))!==JSON.stringify(['source','sourceSha256','name','span','project','qualifiedName','lower']))fail('complete baseline metadata differs');
 const insert=',checkedSource:createProjectCheckedSource(checked,{modules:graph.modules},entry)',at=object.end-1;
 const middle=before.slice(0,at)+insert+before.slice(at),addition='\n'+expected+'\n',after=middle+addition;
 parse(ts,after);
 if(after.slice(0,-addition.length).slice(0,at)+after.slice(0,-addition.length).slice(at+insert.length)!==before)fail('whole native source inverse differs');
 const [equation]=transportConcreteNamedSourcePhases([{before,middle,after,language:'JavaScript',rules:['language:add-authenticated-checked-source-accessor','repository:retain-private-accessor-helper','language:restore-frozen-declaration-carriers','repository:restore-complete-frozen-project']}]);
 const nativeBindings=verifyNativeCopiedModuleBindings(ts,[{path:origin.pathname,source:current},{path:new URL('../paired-project-receiving.mjs',import.meta.url).pathname,source:after}]);
 const relocated=relocateSourceModule(after,origin.href);
 if(equation.inverse!==before||relocated.inverse!==after)fail('complete CST or relocation inverse differs');
 return {schema:'paired-project-accessor-receiving-v1',typescriptVersion:ts.version,before,current,historical,
  equation,relocated,nativeBindings,source:relocated.text,selection:{at,insert,addition,accessor:accessor.getText(birth),helper:expected},
  baselineScope:'method-free-project-cases',sourceAuthority:false,semanticAuthority:false,runtimeParity:false};
}
export function preparePairedProjectAccessorFixture(){
 const before=readFileSync(fixture,'utf8'),current=readFileSync(origin,'utf8'),result=derivePairedProjectAccessorFixture(before,current);
 if(readFileSync(fixture,'utf8')!==before||readFileSync(origin,'utf8')!==current||predecessor().source!==result.historical.source)fail('complete physical source changed');
 return result;
}
export function snapshotProjectAccessors(rows){
 return rows.map(({lower,...fields})=>{
  if(!Object.hasOwn(fields,'checkedSource'))return fields;
  const accessor=fields.checkedSource;let observation;
  try{observation={returned:accessor()};}catch(error){observation={refused:{name:error.name,message:error.message}};}
  return {...fields,checkedSource:{name:accessor.name,length:accessor.length,
   prototype:Object.hasOwn(accessor,'prototype'),source:Function.prototype.toString.call(accessor),
   descriptors:Object.getOwnPropertyDescriptors(accessor),observation}};
 });
}
