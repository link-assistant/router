// Follow actual tracked Rust module files without replacing source fragments.
// A file-selection plan supplies no item expansion or runtime behavior.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {posix} from 'node:path';
import {itemConfiguration,isInertConditionalAttribute} from './cfg-profile.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('./source-profiles/module-paths/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
function pinnedSource(input,maxOutputLength){
  const packed=readFileSync(new URL(input.file,root));
  if(hash(packed)!==input.compressedSha256)throw new TypeError('Module path source archive changed');
  const source=gunzipSync(packed,{maxOutputLength});
  if(source.length!==input.bytes||hash(source)!==input.sha256)throw new TypeError('Module path source differs from its pinned original bytes');
  return source.toString('utf8');
}
pinnedSource(manifest.source,40_000);
const symbolSource=pinnedSource(manifest.identifierSource,100_000);
const [keywordStart,keywordEnd]=manifest.identifierSource.lines.strictAndReservedKeywords;
// Keep the keyword list tied to the compiler's unchanged source, including
// edition-conditional reserved names. Weak keywords are deliberately absent.
const keywords=new Set(symbolSource.split('\n').slice(keywordStart-1,keywordEnd).flatMap(line=>{
  const match=/^\s+[A-Za-z]+:\s+"([A-Za-z]+)"/u.exec(line);return match?[match[1]]:[];
}));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const MODULE_PATH_PROFILE=freeze({...manifest,attributeExpansionAuthority:false});
const plans=new WeakSet(),identifier=/^[\p{XID_Start}_][\p{XID_Continue}_]*$/u;
const asciiIdentifier=/^[A-Za-z_][A-Za-z0-9_]*$/u,forbiddenRawNames=new Set(['_','crate','self','Self','super']);
const actualIdentifier=name=>typeof name==='string'&&name!=='_'&&identifier.test(name)&&name.normalize('NFC')===name;
const plainIdentifier=name=>actualIdentifier(name)&&!keywords.has(name);
// Reuse the pinned compiler-derived strict/reserved keyword selection. The
// conservative 2021/2024 profile leaves weak contextual names available.
export const isPlainSourceIdentifier=plainIdentifier;
const fail=message=>{throw new TypeError('Tracked module path: '+message);};
function canonicalPath(value,{directory=false}={}){
  if(typeof value!=='string'||Buffer.byteLength(value)>MODULE_PATH_PROFILE.limits.pathBytes||value.includes('\\')||value.includes('\0')||value.includes(':')||posix.isAbsolute(value))fail('requires a bounded repository-relative POSIX path');
  if(directory&&value==='.')return value;
  if(!value||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('requires a canonical tracked path');
  return value;
}
function relativePath(base,value){
  canonicalPath(base,{directory:true});
  if(typeof value!=='string'||!value||Buffer.byteLength(value)>MODULE_PATH_PROFILE.limits.pathBytes||value.includes('\\')||value.includes('\0')||value.includes(':')||posix.isAbsolute(value))fail('path literal is outside the portable tracked-file profile');
  const path=posix.normalize(posix.join(base,value));
  canonicalPath(path,{directory:true});return path;
}
function literal(attribute){
  const tokens=attribute.tokens;
  if(tokens.length!==6||tokens[0]!=='#'||tokens[1]!=='['||tokens[2]!=='path'||tokens[3]!=='='||tokens[5]!==']')fail('path attribute requires one original Rust string literal');
  const decoded=tokenizeRust(tokens[4]).filter(token=>token.kind!=='eof');
  if(decoded.length!==1||decoded[0].kind!=='string')fail('path attribute requires one original Rust string literal');
  return decoded[0].value;
}
function header(item,configuration){
  const tokens=item.tokens.filter(token=>token.type!=='comment');
  let at=tokens.findIndex(token=>token.start>=(configuration.attributes.at(-1)?.span.end??item.start));
  if(at<0)fail('missing original module header');
  if(tokens[at]?.text==='pub'){
    at++;
    if(tokens[at]?.text==='('){
      at++;const visibility=[];
      while(at<tokens.length&&tokens[at]?.text!==')')visibility.push(tokens[at++].text);
      if(tokens[at++]?.text!==')')fail('unterminated module visibility');
      const simple=visibility.length===1&&['crate','self','super'].includes(visibility[0]);
      const scoped=visibility[0]==='in'&&visibility.length>=2&&visibility.length%2===0&&['crate','self','super'].includes(visibility[1])&&visibility.slice(2).every((part,index)=>index%2===0?part==='::':plainIdentifier(part));
      if(!simple&&!scoped)fail('module visibility is outside the checked grammar');
    }
  }
  if(tokens[at++]?.text!=='mod')fail('requires the original mod declaration');
  let token=tokens[at++],name=token?.text,rawIdentifier=false;
  if(name==='r'&&tokens[at]?.text==='#'&&tokens[at+1]?.type==='ident'&&token.end===tokens[at].start&&tokens[at].end===tokens[at+1].start){name=tokens[at+1].text;rawIdentifier=true;at+=2;}
  if(!actualIdentifier(name)||(rawIdentifier?forbiddenRawNames.has(name):keywords.has(name)))fail('module name requires a permitted original Rust identifier');
  const inline=tokens[at]?.text==='{';
  if(inline?tokens.at(-1)?.text!=='}':tokens[at]?.text!==';'||at!==tokens.length-1)fail('module delimiter is outside the checked grammar');
  return {name,inline,rawIdentifier};
}
function originalModulePath(module,item,paths,retainUnknown){
  const original=originalSourceModuleItems(module).find(candidate=>candidate.start===item?.start&&candidate.end===item?.end);
  if(!original||original.term!=='mod'||JSON.stringify(original)!==JSON.stringify(item))fail('declaration differs from its complete original source');
  if(!Array.isArray(paths)||paths.length>MODULE_PATH_PROFILE.limits.trackedPaths)fail('tracked path list exceeds its bound');
  const tracked=new Set(paths.map(path=>canonicalPath(path)));
  canonicalPath(module.file);canonicalPath(module.directory,{directory:true});
  if(!tracked.has(module.file))fail('complete original source file is not tracked');
  const pathDirectory=canonicalPath(module.pathDirectory??posix.dirname(module.file),{directory:true});
  const configuration=itemConfiguration(original.tokens,module.compilationProfile);
  if(configuration.status!=='active'&&!(retainUnknown&&configuration.status==='unknown'&&configuration.diagnostics.length===0))fail('module compilation condition is unresolved or inactive');
  const attributes=configuration.attributes.filter(attribute=>attribute.name==='path');
  if(attributes.length>1)fail('duplicate path attributes retain a semantic obligation');
  if(configuration.attributes.some(attribute=>!isInertConditionalAttribute(attribute)&&!['cfg','path'].includes(attribute.name)&&!(attribute.name==='macro_use'&&attribute.tokens.join('')==='#[macro_use]')))fail('enclosing module attribute owner or expansion is unresolved');
  const parsed=header(original,configuration),override=attributes.length?literal(attributes[0]):null;
  if(!parsed.inline&&override===null&&!asciiIdentifier.test(parsed.name))fail('default external module name requires the ASCII filesystem identifier profile');
  let target=null,directory,childPathDirectory,candidates=[];
  if(parsed.inline){
    directory=override===null?posix.join(module.directory,parsed.name):relativePath(pathDirectory,override);
    canonicalPath(directory,{directory:true});childPathDirectory=directory;
  }else{
    candidates=override===null?[posix.join(module.directory,parsed.name+'.rs'),posix.join(module.directory,parsed.name,'mod.rs')]:[relativePath(pathDirectory,override)];
    candidates.forEach(path=>canonicalPath(path));
    const found=candidates.filter(path=>tracked.has(path));
    if(found.length!==1)fail(found.length?'ambiguous tracked module files':'missing tracked module file');
    target=found[0];
    if(!target.endsWith('.rs'))fail('explicit module file needs a tracked Rust source');
    // Rust treats every #[path]-included file like mod.rs, so default children
    // are siblings even when the selected file is named something_else.rs.
    directory=override!==null||target.endsWith('/mod.rs')?posix.dirname(target):target.slice(0,-3);
    childPathDirectory=posix.dirname(target);
  }
  const plan=freeze({profile:MODULE_PATH_PROFILE.profile,rust:MODULE_PATH_PROFILE.rust,name:parsed.name,rawIdentifier:parsed.rawIdentifier,inline:parsed.inline,target,directory,pathDirectory:childPathDirectory,candidates,explicitPath:override,
    source:module.file,sourceSha256:hash(module.source),module:[...module.path],sourceViewDigest:module.sourceView?.digest??null,span:{start:original.start,end:original.end},declarationSha256:hash(module.source.slice(original.start,original.end)),
    attributes:configuration.attributes,configurationCondition:configuration.status,availabilitySelected:configuration.status==='active',namespaceAuthority:false,attributeExpansionAuthority:false,runtimeAuthority:false});
  plans.add(plan);return plan;
}
export const planTrackedModulePath=(module,item,paths)=>originalModulePath(module,item,paths,false);
// Retain a unique complete source candidate without admitting its cfg-selected
// availability. The project must propagate `unknown` to every child body.
export const planConditionalModuleSourcePath=(module,item,paths)=>originalModulePath(module,item,paths,true);
export const isTrackedModulePathPlan=plan=>!!plan&&plans.has(plan);
