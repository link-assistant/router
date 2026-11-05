// Source observations from the genuine SDK already selected by the private
// loader. Public library rows alone never issue a type or executable permit.
import {join,relative,sep} from 'node:path';
import {lstatSync,realpathSync} from 'node:fs';
import {ownershipCompiler,ownershipCompilerRuntimeSourceScopeCurrent,ownershipCompilerRuntimeOriginData} from './js-to-rust/vendor/module-syntax.mjs';
import {readCompactSparsePhysicalFile,sameCompactPhysicalSourceStamp} from './compact-sparse-git-io-20261102.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation,withSourceFailureOperation} from './source-failure-operations.mjs';
const PREFIX='typescript-standard-library-20261103/',MAX=8388608;
const fail=message=>{throw TypeError('Original standard-map TypeScript library: '+message);};
const stamp=stat=>[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs].map(value=>value.toString());
function equal(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,at)=>value===b[at]);}
/** Complete installed standard-library declaration DATA, read without loading a
 * second compiler. Call only inside an already genuine receiving SDK process. */
export function withBorrowedStandardMapTypeScriptLibrarySources(run){
 requireSynchronousSourceCallback(run);
 return withSourceFailureOperation(()=>{
  const ts=ownershipCompiler(),origin=withSourceInputValidation(()=>{
   if(!ownershipCompilerRuntimeSourceScopeCurrent(ts)||ts.version!=='5.9.3')fail('genuine current SDK source-scope birth required');const origin=ownershipCompilerRuntimeOriginData(ts);if(!origin||typeof origin.packageRoot!=='string'||!Array.isArray(origin.files)||origin.files.length>512)fail('actual private SDK physical origin required');return origin;
  }),retained=[];let bytes=0;
  const current=()=>withSourceInputValidation(()=>{
   let failed=false,primary;const check=run=>{try{run();}catch(error){if(!failed){failed=true;primary=error;}}};
   check(()=>{if(ownershipCompiler()!==ts||!ownershipCompilerRuntimeSourceScopeCurrent(ts))fail('genuine native SDK association changed');const now=ownershipCompilerRuntimeOriginData(ts);if(!now||now.packageRoot!==origin.packageRoot||now.files.length!==origin.files.length||now.files.some((row,at)=>row.path!==origin.files[at].path||!equal(row.identity,origin.files[at].identity)))fail('complete original SDK cohort changed');});
   for(const row of retained)check(()=>{const after=lstatSync(row.physical,{bigint:true});if(!sameCompactPhysicalSourceStamp(row.stat,after)||realpathSync(row.physical)!==row.physical||!readCompactSparsePhysicalFile({path:row.physical,stat:row.stat}).equals(row.bytes))fail('complete original library bytes changed');});
   if(failed)throw primary;
  });
  return withCompleteSourceClosingFence(()=>{
   withSourceInputValidation(()=>{
    for(const row of origin.files){const name=relative(join(origin.packageRoot,'lib'),row.path);if(name.startsWith('..'+sep)||name==='..'||name.includes(sep)||!/^lib(?:\.[A-Za-z0-9_-]+)*\.d\.ts$/u.test(name))continue;
     const stat=lstatSync(row.path,{bigint:true});if(!equal(stamp(stat),row.identity)||!stat.isFile()||stat.isSymbolicLink()||realpathSync(row.path)!==row.path)fail('actual original library file identity required');const raw=readCompactSparsePhysicalFile({path:row.path,stat});if((bytes+=raw.length)>MAX||retained.length>=512)fail('complete original library DATA budget');const source=raw.toString('utf8');if(!Buffer.from(source).equals(raw))fail('complete original library strict UTF8 required');const concrete=transportConcreteSyntaxSource(source,{language:'TypeScript'});if(concrete.source!==source||transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete original library CST changed');retained.push({path:PREFIX+name,source,physical:row.path,stat,bytes:raw});
    }
    for(const name of ['lib.es5.d.ts','lib.es2015.collection.d.ts'])if(!retained.some(row=>row.path===PREFIX+name))fail('complete actual standard-library declarations missing');current();
   });
   return run(retained.map(({path,source})=>({path,source})));
  },[current,()=>{for(const row of retained)row.bytes=null;retained.length=0;}]);
 });
}
export function borrowedStandardMapReverseLibrarySources(){return withBorrowedStandardMapTypeScriptLibrarySources(rows=>rows);}
/** Called only after the original source traversal has checked its private
 * analysis/state association. This return is a domain tag, never that receipt. */
export function readBorrowedStandardMapReadonlyInput(type,analysis){
 const {ts,checker,syntax}=analysis;
 if(!ts.isTypeReferenceNode(type)||!ts.isIdentifier(type.typeName)||type.typeName.text!=='ReadonlyMap')return null;
 if(type.typeArguments?.length!==2||type.typeArguments.some(argument=>argument.kind!==ts.SyntaxKind.StringKeyword))fail('actual ReadonlyMap<string,string> required');
 return withBorrowedStandardMapTypeScriptLibrarySources(rows=>withSourceInputValidation(()=>{
  if(ts!==ownershipCompiler())fail('actual native checker SDK differs');const sources=new Map(rows.map(row=>[row.path,row.source]));
  // Keep the complete declaration closure in the actual receiving Program.
  // A matching declaration fragment or renamed interface is insufficient.
  for(const [path,source]of sources){const file=syntax.get(path);if(!file||file.fileName!==path||file.text!==source)fail('actual complete standard-library source set required');}
  const symbol=checker.getSymbolAtLocation(type.typeName),declarations=symbol?.declarations;if(!declarations?.length||declarations.length>512)fail('actual original ReadonlyMap symbol required');
  for(const declaration of declarations){const file=declaration.getSourceFile();if(!ts.isInterfaceDeclaration(declaration)||declaration.name.text!=='ReadonlyMap'||!sources.has(file.fileName)||syntax.get(file.fileName)!==file||file.text!==sources.get(file.fileName)||declaration.typeParameters?.length!==2)fail('shadowed, augmented or foreign ReadonlyMap owner refused');}
  return 'standard-text-map-input';
 }));
}
