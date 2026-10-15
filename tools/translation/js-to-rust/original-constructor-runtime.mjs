// Explicit receiving-environment execution only. No source graph is executed
// during analysis, checking, serialization, emission or ordinary evaluation.
import {readFile,lstat,realpath} from 'node:fs/promises';
import {resolve,join,posix} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {check} from './vendor/ir.mjs';
import {sourceConstructorItem} from './vendor/constructor-bodies.mjs';
import {originalImportedErrorConstructor,reissueImportedErrorConstructor} from './vendor/source-constructors.mjs';
import {ownershipSyntax} from './vendor/module-syntax.mjs';

const runtimes=new WeakMap(),observedSourceVersions=new Map();
const construct=Reflect.construct;
const hash=source=>createHash('sha256').update(Buffer.from(source,'utf16le')).digest('hex');
async function originalFile(root,path) {
  let current=root;
  for(const [index,part]of path.split('/').entries()) {
    current=join(current,part);const status=await lstat(current);
    if(status.isSymbolicLink()||(index===path.split('/').length-1?!status.isFile():!status.isDirectory()))throw Error('linked or nonregular original constructor runtime source');
  }
  return readFile(current,'utf8');
}
export async function prepareOriginalConstructorRuntime(program,{sourceRoot,executeOriginalModules=false}={}) {
  if(executeOriginalModules!==true||typeof sourceRoot!=='string')throw Error('original constructor evaluation requires an explicit receiving source root and module-execution opt-in');
  const root=resolve(sourceRoot);
  if(await realpath(root)!==root)throw Error('linked original constructor receiving root');
  const expected=new Map(),definitions=new Map();
  for(const item of program)if(sourceConstructorItem(item)) {
    const checked=check(item,new Map());
    for(const source of checked.sourceConstructors.sources) {
      if(expected.has(source.path)&&expected.get(source.path)!==source.source)throw Error('conflicting original constructor runtime sources');
      expected.set(source.path,source.source);
    }
    for(const proof of checked.sourceConstructors.constructors) {
      const fresh=originalImportedErrorConstructor(reissueImportedErrorConstructor(proof)).proof;
      const key=fresh.import.target+'#'+fresh.import.exported;
      let entry=definitions.get(key);
      if(!entry){entry={proof:fresh,proofs:new Set()};definitions.set(key,entry);}
      // Retain every actual callsite, including its entire source graph, not
      // merely the exported class name or one last-seen constructor recipe.
      entry.proofs.add(JSON.stringify(fresh));
    }
  }
  const verify=async()=>{
    for(const [path,source]of expected) {
      if(await originalFile(root,path)!==source)throw Error('original constructor runtime source differs from its checked graph');
      const before=observedSourceVersions.get(join(root,path));
      if(before!==undefined&&before!==hash(source))throw Error('original constructor module cache source changed; reload convergence is unsupported');
    }
  };
  await verify();
  // Only constructor owners and their actual relative static import closure
  // may execute. The other supplied original modules are byte witnesses only.
  const closure=new Set();
  const collect=path=>{
    if(closure.has(path))return;closure.add(path);
    const source=expected.get(path);if(source===undefined)throw Error('missing original constructor runtime import');
    const {ts,file}=ownershipSyntax(source);
    for(const statement of file.statements)if(ts.isImportDeclaration(statement)||ts.isExportDeclaration(statement)&&statement.moduleSpecifier) {
      const specifier=statement.moduleSpecifier;
      if(!ts.isStringLiteral(specifier)||!specifier.text.startsWith('./')&&!specifier.text.startsWith('../'))throw Error('unproved external constructor bootstrap import');
      const next=posix.normalize(posix.join(posix.dirname(path),specifier.text));
      if(!expected.has(next))throw Error('escaping or missing original constructor runtime import');
      collect(next);
    }
    const visit=node=>{if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)throw Error('dynamic constructor bootstrap imports remain unsupported');ts.forEachChild(node,visit);};visit(file);
  };
  for(const {proof}of definitions.values())collect(proof.import.target);
  // Record before importing: a failed/effectful receiving module is not safely
  // reusable with changed bytes in this process's immutable ESM URL cache.
  for(const path of closure)observedSourceVersions.set(join(root,path),hash(expected.get(path)));
  const actual=new Map();
  for(const [key,{proof,proofs}]of definitions) {
    const module=await import(pathToFileURL(join(root,proof.import.target)).href),constructor=module[proof.import.exported];
    if(typeof constructor!=='function')throw Error('missing actual original exported Error constructor');
    actual.set(key,{constructor,proofs});
  }
  await verify();
  const token=Object.freeze({});runtimes.set(token,actual);return token;
}
export function constructOriginalError(proof,runtime) {
  const state=originalImportedErrorConstructor(reissueImportedErrorConstructor(proof)),actual=runtimes.get(runtime);
  const entry=actual?.get(state.proof.import.target+'#'+state.proof.import.exported);
  if(!entry)throw Error('original constructor evaluation requires its verified receiving runtime');
  if(!entry.proofs.has(JSON.stringify(state.proof)))throw Error('foreign original constructor runtime graph, caller or proof');
  const args=[];
  for(let index=0;index<state.proof.arguments.length;index++) {
    const value=state.proof.arguments[index];args[index]=value.kind==='null'?null:value.kind==='undefined'?undefined:value.value;
  }
  return construct(entry.constructor,args);
}
