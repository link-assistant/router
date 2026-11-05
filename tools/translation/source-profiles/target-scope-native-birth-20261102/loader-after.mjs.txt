import {captureOwnershipRuntimeOriginBefore,verifyOwnershipRuntimeOriginLoadWindow,verifyOwnershipRuntimeOriginCurrent,detachOwnershipRuntimeOriginData} from '../../forward-output-ownership-20261101-native-origin.mjs';
import { createRequire,Module } from 'node:module';
import {types as ownershipNativeTypes} from 'node:util';
import * as ownershipNativeFs from 'node:fs';
import { dirname,resolve,join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const require=createRequire(join(sourceRoot,'js/package.json'));
let compiler,latest;
// Loading the pinned compiler does not imply parsing a source under a dummy
// filename. Graph producers perform their own actual-path parse and guards.
export function ownershipCompiler() {
  compiler??=ownershipRuntimeRequire(require);
  return compiler;
}
export function ownershipSyntax(source) {
  if(latest?.source===source)return latest.syntax;
  ownershipCompiler();
  const file=compiler.createSourceFile('module-ownership.mjs',source,compiler.ScriptTarget.Latest,true,compiler.ScriptKind.JS);
  if(file.parseDiagnostics.length)throw new Error('invalid module ownership syntax');
  const syntax={ts:compiler,file};latest={source,syntax};return syntax;
}

// Native loader/function identities only. No source, syntax or verdict cache.
const ownershipRuntimeRoot=globalThis;
const ownershipRuntimeLazyAssertions=["assertEachNode","assertNode","assertNotNode","assertOptionalNode","assertOptionalToken","assertMissingNode"];
const ownershipRuntimeOps={get:Object.getOwnPropertyDescriptor,keys:Reflect.ownKeys,parent:Object.getPrototypeOf,define:Object.defineProperty,own:Object.hasOwn,apply:Reflect.apply,proxy:ownershipNativeTypes.isProxy};
const ownershipRuntimeLoader={globalSelf:ownershipRuntimeOps.get(ownershipRuntimeRoot,'globalThis'),modulePrototype:ownershipRuntimeOps.get(Module,'prototype'),load:ownershipRuntimeOps.get(Module,'_load'),extensions:ownershipRuntimeOps.get(Module,'_extensions'),compile:ownershipRuntimeOps.get(Module.prototype,'_compile'),resolve:ownershipRuntimeOps.get(Module,'_resolveFilename'),moduleCache:ownershipRuntimeOps.get(Module,'_cache'),cache:ownershipRuntimeOps.get(require,'cache'),object:Object,array:Array,reflect:Reflect,globals:[ownershipRuntimeOps.get(ownershipRuntimeRoot,'Object'),ownershipRuntimeOps.get(ownershipRuntimeRoot,'Array'),ownershipRuntimeOps.get(ownershipRuntimeRoot,'Reflect')],operationFields:[ownershipRuntimeOps.get(Object,'getOwnPropertyDescriptor'),ownershipRuntimeOps.get(Reflect,'ownKeys'),ownershipRuntimeOps.get(Object,'getPrototypeOf'),ownershipRuntimeOps.get(Object,'defineProperty'),ownershipRuntimeOps.get(Object,'hasOwn'),ownershipRuntimeOps.get(Reflect,'apply'),ownershipRuntimeOps.get(ownershipNativeTypes,'isProxy')]};
const ownershipRuntimeFs=(()=>{const o=ownershipRuntimeOps,field=o.get(ownershipNativeFs,'default'),owners=[ownershipNativeFs],rows=[];if(field&&o.own(field,'value')&&field.value)o.define(owners,'1',{value:field.value,writable:true,enumerable:true,configurable:true});for(let at=0;at<owners.length;at++){const owner=owners[at];if(o.proxy(owner))return null;const names=o.keys(owner),fields=[];for(let index=0;index<names.length;index++)o.define(fields,''+fields.length,{value:o.get(owner,names[index]),writable:true,enumerable:true,configurable:true});o.define(rows,''+rows.length,{value:{owner,names,fields},writable:true,enumerable:true,configurable:true});}return rows;})();
const ownershipRuntimeExtensions=(()=>{const o=ownershipRuntimeOps,field=ownershipRuntimeLoader.extensions;if(!field||!o.own(field,'value')||!field.value||o.proxy(field.value))return null;const names=o.keys(field.value),rows=[];for(let at=0;at<names.length;at++)o.define(rows,''+rows.length,{value:[names[at],o.get(field.value,names[at])],writable:true,enumerable:true,configurable:true});return rows;})();
let ownershipRuntimeNative=null,ownershipRuntimeAttempted=false;
// Origin is detached filesystem DATA only. Metadata failure never changes
// the original compiler return/throw; qualified consumers observe it explicitly.
let ownershipRuntimeOrigin=null,ownershipRuntimeOriginAssociation=null,ownershipRuntimeOriginValue=null,ownershipRuntimeOriginValueCaptured=false,ownershipRuntimeOriginFailed=false,ownershipRuntimeOriginFailure;
function ownershipRuntimeSame(a,b){const o=ownershipRuntimeOps;if(!a||!b)return a===b;const names=['value','get','set','writable','enumerable','configurable'];for(let at=0;at<names.length;at++){const key=names[at];if(o.own(a,key)!==o.own(b,key)||o.own(a,key)&&a[key]!==b[key])return false;}return true;}
function ownershipRuntimeLoadersCurrent(){
 const o=ownershipRuntimeOps,l=ownershipRuntimeLoader;if(!ownershipRuntimeSame(o.get(ownershipRuntimeRoot,'globalThis'),l.globalSelf))return false;const globals=['Object','Array','Reflect'];for(let at=0;at<globals.length;at++)if(!ownershipRuntimeSame(o.get(ownershipRuntimeRoot,globals[at]),l.globals[at]))return false;
 const owners=[l.object,l.reflect,l.object,l.object,l.object,l.reflect,ownershipNativeTypes],names=['getOwnPropertyDescriptor','ownKeys','getPrototypeOf','defineProperty','hasOwn','apply','isProxy'];for(let at=0;at<names.length;at++)if(!ownershipRuntimeSame(o.get(owners[at],names[at]),l.operationFields[at]))return false;
 if(!ownershipRuntimeSame(o.get(Module,'prototype'),l.modulePrototype))return false;
 if(!ownershipRuntimeSame(o.get(Module,'_load'),l.load)||!ownershipRuntimeSame(o.get(Module,'_extensions'),l.extensions)||!ownershipRuntimeSame(o.get(Module.prototype,'_compile'),l.compile)||!ownershipRuntimeSame(o.get(Module,'_resolveFilename'),l.resolve)||!ownershipRuntimeSame(o.get(Module,'_cache'),l.moduleCache)||!ownershipRuntimeSame(o.get(require,'cache'),l.cache)||!ownershipRuntimeExtensions)return false;
 if(!ownershipRuntimeFs)return false;for(let at=0;at<ownershipRuntimeFs.length;at++){const row=ownershipRuntimeFs[at],names=o.keys(row.owner);if(names.length!==row.names.length)return false;for(let index=0;index<names.length;index++)if(names[index]!==row.names[index]||!ownershipRuntimeSame(o.get(row.owner,names[index]),row.fields[index]))return false;}
 const keys=o.keys(l.extensions.value);if(keys.length!==ownershipRuntimeExtensions.length)return false;for(let at=0;at<keys.length;at++)if(keys[at]!==ownershipRuntimeExtensions[at][0]||!ownershipRuntimeSame(o.get(l.extensions.value,keys[at]),ownershipRuntimeExtensions[at][1]))return false;return true;
}
function ownershipRuntimeCapture(value){
 const o=ownershipRuntimeOps,rows=[];function append(array,item){o.define(array,''+array.length,{value:item,writable:true,enumerable:true,configurable:true});}
 function capture(owner,selected){if(!owner||typeof owner!=='object'&&typeof owner!=='function'||o.proxy(owner))return false;for(let at=0;at<rows.length;at++)if(rows[at].owner===owner)return true;const names=selected??o.keys(owner),fields=[];for(let at=0;at<names.length;at++)append(fields,o.get(owner,names[at]));append(rows,{owner,names,fields,parent:o.parent(owner),selected:!!selected});return true;}
 if(!capture(value,['noop','createSourceFile','isImportDeclaration','isExportDeclaration','forEachChild','forEachChildRecursively','setParentRecursive','setParent','isJSDocNode','ScriptKind','ScriptTarget','Debug','objectAllocator','performance','tracing']))return null;
 // The actual fresh official module has returned; these are its original
 // exported containers and allocator factories, before caller access resumes.
 const objects=[value.ScriptKind,value.ScriptTarget,value.Debug,value.objectAllocator,value.performance];
 for(let at=0;at<objects.length;at++)if(!capture(objects[at]))return null;
 if(value.Debug.loggingHost!==undefined&&!capture(value.Debug.loggingHost))return null;
 const names=['getNodeConstructor','getTokenConstructor','getIdentifierConstructor','getPrivateIdentifierConstructor','getSourceFileConstructor'];
 for(let at=0;at<names.length;at++){const field=o.get(value.objectAllocator,names[at]);if(!field||!o.own(field,'value')||typeof field.value!=='function'||o.proxy(field.value))return null;let ctor=o.apply(field.value,value.objectAllocator,[]),depth=0;if(typeof ctor!=='function'||!capture(ctor))return null;let owner=ctor.prototype;while(owner!==null){if(++depth>8||!capture(owner))return null;owner=o.parent(owner);}owner=o.parent(ctor);depth=0;while(owner!==null){if(++depth>8||!capture(owner))return null;owner=o.parent(owner);}}
 const noop=value.noop,level=o.get(value.Debug,'getAssertionLevel');if(typeof noop!=='function'||o.proxy(noop)||!level||!o.own(level,'value')||typeof level.value!=='function'||o.proxy(level.value))return null;
 let sourceScopeBirth=null;try{sourceScopeBirth=ownershipRuntimeCaptureSourceScopeBirth(value);}catch{}
 return {value,rows,noop,debug:value.Debug,getLevel:level.value,sourceScopeBirth};
}
// Extended source-scope identities are captured at the same genuine private
// fresh module birth, before its first caller can mutate exported predicates.
// This separate optional frame never changes the original selected guard/API.
function ownershipRuntimeCaptureSourceScopeBirth(value){
 const o=ownershipRuntimeOps,rows=[],bindings=[];let fields=0;
 const append=item=>o.define(rows,''+rows.length,{value:item,writable:true,enumerable:true,configurable:true});
 const capture=owner=>{
  if(!owner||typeof owner!=='object'&&typeof owner!=='function'||o.proxy(owner))return false;
  for(let at=0;at<rows.length;at++)if(rows[at].owner===owner)return true;
  const names=o.keys(owner);if(names.length>8192||fields+names.length>65536)return false;
  const descriptors=[];for(let at=0;at<names.length;at++)o.define(descriptors,''+descriptors.length,{value:o.get(owner,names[at]),writable:true,enumerable:true,configurable:true});
  fields+=names.length;append({owner,names,descriptors,parent:o.parent(owner)});return true;
 };
 if(!capture(value))return null;
 const root=rows[0];for(let at=0;at<root.names.length;at++){const field=root.descriptors[at];if(!field)return null;let original;if(o.own(field,'value'))original=field.value;else{if(typeof field.get!=='function'||o.proxy(field.get))return null;original=o.apply(field.get,value,[]);}o.define(bindings,''+bindings.length,{value:{name:root.names[at],value:original},writable:true,enumerable:true,configurable:true});}
 const names=['SyntaxKind','ScriptKind','ScriptTarget','ModuleKind','ModuleResolutionKind','NodeFlags','ModifierFlags','SymbolFlags','TypeFlags','ObjectFlags','sys','factory'];
 for(let at=0;at<names.length;at++)if(!capture(value[names[at]]))return null;
 return {rows,fields,bindings,revoked:false};
}
export function ownershipCompilerRuntimeSourceScopeCurrent(value){
 const n=ownershipRuntimeNative,o=ownershipRuntimeOps;
 if(!n||n.value!==value||!n.sourceScopeBirth)return false;
 const scope=n.sourceScopeBirth;if(scope.revoked)return false;
 try{
  if(!ownershipCompilerRuntimeNativeCurrent(value))throw TypeError('Original native selected birth differs');
  for(let at=0;at<scope.rows.length;at++){
   const row=scope.rows[at];if(o.proxy(row.owner)||o.parent(row.owner)!==row.parent)throw TypeError('Original source-scope export owner differs');
   const names=o.keys(row.owner);if(names.length!==row.names.length)throw TypeError('Original source-scope export membership differs');
   for(let index=0;index<names.length;index++)if(names[index]!==row.names[index]||!ownershipRuntimeSame(o.get(row.owner,names[index]),row.descriptors[index]))throw TypeError('Original source-scope export descriptor differs');
  }
  // Original getters can retain identity while an official SDK setter changes
  // their private exported binding. Rejoin actual values, not descriptor names.
  for(let at=0;at<scope.bindings.length;at++){
   const binding=scope.bindings[at],field=o.get(value,binding.name),actual=o.own(field,'value')?field.value:o.apply(field.get,value,[]),original=binding.value;
   if(actual!==original&&!(actual!==actual&&original!==original))throw TypeError('Original source-scope exported binding differs');
  }
  return true;
 }catch{scope.revoked=true;return false;}
}

// Only original source-selected native require functions enter this private
// loader. No public callback or caller-supplied compiler can issue identities.
function ownershipRuntimeRequire(load,root=sourceRoot){
 const o=ownershipRuntimeOps;let before=null,cache=null;
 if(!ownershipRuntimeAttempted&&root===sourceRoot){ownershipRuntimeAttempted=true;try{if(ownershipRuntimeLoadersCurrent()){const field=ownershipRuntimeLoader.cache;cache=field&&o.own(field,'value')?field.value:null;if(cache&&!o.proxy(cache)){before=o.keys(cache);if(before.length>8192)before=null;}}}catch{before=null;}}
 let originBefore=null,originTried=false;
 if(before&&root===sourceRoot)try{originTried=true;if(!ownershipRuntimeLoadersCurrent())throw TypeError('Original native loader source guards unavailable');const resolver=o.get(load,'resolve');if(!resolver||!o.own(resolver,'value')||typeof resolver.value!=='function'||o.proxy(resolver.value))throw TypeError('Actual private native resolver unavailable');const filename=o.apply(resolver.value,load,['typescript']),packageJson=o.apply(resolver.value,load,['typescript/package.json']);originBefore=captureOwnershipRuntimeOriginBefore(root,filename,packageJson);if(!ownershipRuntimeLoadersCurrent())throw TypeError('Original native loader changed during origin acquisition');}catch(error){ownershipRuntimeOriginFailed=true;ownershipRuntimeOriginFailure=error;}
 const value=load('typescript');if(originTried){ownershipRuntimeOriginValue=value;ownershipRuntimeOriginValueCaptured=true;}
 if(before)try{const names=o.keys(cache);if(names.length>8192)return value;let matched=null;for(let at=0;at<names.length;at++){let old=false;for(let index=0;index<before.length;index++)if(names[at]===before[index]){old=true;break;}if(old)continue;const field=o.get(cache,names[at]),module=field&&o.own(field,'value')?field.value:null;if(!module||o.proxy(module))continue;const exported=o.get(module,'exports'),loaded=o.get(module,'loaded'),filename=o.get(module,'filename');if(exported&&o.own(exported,'value')&&exported.value===value&&loaded&&o.own(loaded,'value')&&loaded.value===true&&filename&&o.own(filename,'value')&&typeof filename.value==='string'&&filename.value===names[at]){if(matched){matched=null;break;}matched=module;}}
  if(matched&&ownershipRuntimeLoadersCurrent()){ownershipRuntimeNative=ownershipRuntimeCapture(value);if(originBefore&&!ownershipRuntimeOriginFailed)try{const filename=o.get(matched,'filename');if(!filename||!o.own(filename,'value')||filename.value!==originBefore.resolvedFilename)throw TypeError('Unique actual native module/resolver coordinate differs');const known=path=>{for(let index=0;index<originBefore.files.length;index++)if(originBefore.files[index].path===path)return true;return false;};for(let index=0;index<names.length;index++){let existed=false;for(let prior=0;prior<before.length;prior++)if(before[prior]===names[index]){existed=true;break;}if(existed)continue;const field=o.get(cache,names[index]),module=field&&o.own(field,'value')?field.value:null;if(!module||o.proxy(module))throw TypeError('Unknown newly loaded native module');const path=o.get(module,'filename'),loaded=o.get(module,'loaded');if(!path||!o.own(path,'value')||typeof path.value!=='string'||!loaded||!o.own(loaded,'value')||loaded.value!==true||!known(ownershipNativeFs.realpathSync(path.value)))throw TypeError('Loaded native dependency outside original captured cohort');}verifyOwnershipRuntimeOriginLoadWindow(originBefore);if(!ownershipRuntimeLoadersCurrent())throw TypeError('Original native loader changed during origin closing');ownershipRuntimeOrigin=originBefore;ownershipRuntimeOriginAssociation={module:matched,cache,filename:filename.value,exports:o.get(matched,'exports'),loaded:o.get(matched,'loaded'),file:o.get(matched,'filename')};}catch(error){ownershipRuntimeOriginFailed=true;ownershipRuntimeOriginFailure=error;}}
 }catch{ownershipRuntimeNative=null;}
 return value;
}
export function ownershipCompilerRuntimeNativeCurrent(value){
 const n=ownershipRuntimeNative,o=ownershipRuntimeOps;if(!n||n.value!==value||!ownershipRuntimeLoadersCurrent())return false;
 for(let at=0;at<n.rows.length;at++){const row=n.rows[at];if(o.proxy(row.owner)||o.parent(row.owner)!==row.parent)return false;const names=row.selected?row.names:o.keys(row.owner);if(names.length!==row.names.length)return false;for(let index=0;index<names.length;index++){if(names[index]!==row.names[index])return false;const actual=o.get(row.owner,names[index]),birth=row.fields[index];if(ownershipRuntimeSame(actual,birth))continue;let lazy=false;if(row.owner===n.debug)for(let item=0;item<ownershipRuntimeLazyAssertions.length;item++)if(names[index]===ownershipRuntimeLazyAssertions[item]){lazy=true;break;}if(!lazy||!actual||!birth||!o.own(actual,'value')||!o.own(birth,'value')||typeof birth.value!=='function'||actual.value!==n.noop||actual.get!==birth.get||actual.set!==birth.set||actual.writable!==birth.writable||actual.enumerable!==birth.enumerable||actual.configurable!==birth.configurable)return false;}}
 return o.apply(n.getLevel,n.debug,[])===0;
}

export function ownershipCompilerRuntimeLoad(sourceRoot) {
  const require = createRequire(join(sourceRoot, 'js/package.json'));
  return ownershipRuntimeRequire(require,sourceRoot);
}

// This getter grants NO native/source/type/owner permission. Only the original
// private fresh-loader association can supply its actual physical origin DATA.
// Unknown/preloaded values cannot gain authority from public paths/sys fields.
export function ownershipCompilerRuntimeOriginData(value){
 if(!ownershipRuntimeOriginValueCaptured||value!==ownershipRuntimeOriginValue)return null;
 if(ownershipRuntimeOriginFailed)throw ownershipRuntimeOriginFailure;
 if(!ownershipCompilerRuntimeNativeCurrent(value)||!ownershipRuntimeOrigin||!ownershipRuntimeOriginAssociation)return null;
 const association=ownershipRuntimeOriginAssociation,o=ownershipRuntimeOps,current=o.get(association.cache,association.filename);if(!current||!o.own(current,'value')||current.value!==association.module||!ownershipRuntimeSame(o.get(association.module,'exports'),association.exports)||!ownershipRuntimeSame(o.get(association.module,'loaded'),association.loaded)||!ownershipRuntimeSame(o.get(association.module,'filename'),association.file))throw TypeError('Actual original native module cache association changed');
 verifyOwnershipRuntimeOriginCurrent(ownershipRuntimeOrigin);return detachOwnershipRuntimeOriginData(ownershipRuntimeOrigin);
}
