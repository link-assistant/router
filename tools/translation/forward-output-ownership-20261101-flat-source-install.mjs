import {resolveForwardSourceEquation} from './forward-output-ownership-20261101-source-equation-bank.mjs';
// Flat-specific guarded source writer, internally bound to the genuine full
// prepareFlatNativeOutputTextRetention producer. SOURCE ONLY / UNRUN.
// Complete guarded predecessor: standard profile originals/layout-transport__
// unit-runtime-materialization.mjs.txt. Exact source/CST equations retain it.
// Cooperative/exclusive writers only: Node offers no conditional inode CAS,
// global atomic publication or durable crash-recovery guarantee here.
import fs from 'node:fs';
import {captureExplicitSourceMutationPolicy} from './unit-runtime-materialization.mjs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {prepareFlatNativeOutputTextRetention} from './prepare-flat-native-output-text-retention.mjs';
import {captureFlatSourceInstallationInputs} from './forward-output-ownership-20261101-flat-source-inputs.mjs';
import {forwardCustodyFilesystemData as io} from './forward-output-ownership-20261101.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const fail=message=>{throw TypeError('Fresh flat source installation: '+message);};
const relative=io.path,physical=io.physical;
const source=(root,name)=>{const file=physical(root,name);try{io.statFile(file);}catch(error){if(io.errorField(error,'code')==='ENOENT')return null;throw error;}return io.readSmall(file,32*1024*1024);};
const FLAT_TARGETS=Object.freeze([
 'tools/translation/private-flat-native-output-text.mjs',
 'tools/translation/flat-native-retained-owned-field-bulk.mjs',
 'tools/translation/flat-native-retained-owned-field-matrix-bulk.mjs',
 'tools/translation/isolated-flat-native-retained-owned-field-matrix-bulk.mjs',
 'tools/translation/flat-native-owned-field-isolated-matrix-session.mjs',
 'tools/translation/flat-native-owned-field-isolated-matrix-profile.mjs',
 'scripts/translate-router-flat-native-owned-field-meta.mjs',
 'tools/translation/test/flat-native-output-text-retention.test.mjs',
]);
function materialization(plan,scope){
 if(plan.schema!=='flat-native-output-retention-source-v1'||!Array.isArray(plan.files)||plan.files.length!==FLAT_TARGETS.length)fail('complete actual original producer result required');
 const outputs=[],seen=new Set();
 for(const row of plan.files){const equation=row.currentSourceEquation,resolved=resolveForwardSourceEquation(row);if(!FLAT_TARGETS.includes(row.path)||seen.has(row.path)||!equation||equation.path!==row.path||typeof row.after!=='string'||resolved.after!==row.after||resolved.inverse!==resolved.before||transportConcreteSyntaxMeta(resolved.beforeMeta).source!==resolved.before||transportConcreteSyntaxMeta(resolved.afterMeta).source!==row.after||!io.same(equation.trace.map(part=>part.phase),['language','repository'])||!io.same(equation.inverseTrace.map(part=>part.phase),['language','repository']))fail('complete current target/source/CST/two-phase inverse differs');seen.add(row.path);
  const actual=scope.current(row.path),before=equation.beforePresent?resolved.before:null;if((actual?.source??null)!==before||(actual?.mode??null)!==equation.beforeMode)fail('fresh actual target bytes/mode differ');
  if(actual){const stat=io.statFile(physical(scope.root,row.path)),full=io.complete(stat).map(String);if(stat.mode&0o7000)fail('special source permission bits are outside the ordinary generated-source mode domain');if(!io.same(full,equation.beforeIdentity))fail('fresh full original target identity/time differ');}
  outputs.push({path:row.path,before,after:row.after,inverse:before,mode:actual?.mode??(0o666&~process.umask()),kind:'fixed-flat-source-successor'});
 }
 return {schema:'fresh-flat-original-source-installation-20261101',producerSchema:plan.schema,root:scope.root,inputs:[],outputs};
}
function sameOutputs(left,right){return left.outputs.length===right.outputs.length&&left.outputs.every((row,index)=>{const other=right.outputs[index];return row.path===other.path&&row.before===other.before&&row.after===other.after&&row.mode===other.mode;});}
// Capture before either fixed producer or await. The policy only vetoes
// mutations; the actual original producer/source scope remains mandatory.
export async function installFreshFlatNativeOutputTextRetention({root=ROOT}={}){
 const policy=captureExplicitSourceMutationPolicy(root);let original,scope,failed=false,primary,value;const secondary=[];
 const record=error=>{if(!failed){failed=true;primary=error;}else secondary.push(error);};
 try{
  original=captureFlatSourceInstallationInputs(root);
  scope=Object.freeze({...original,
   verify(){return io.closing(()=>{},[()=>original.verify(),()=>policy.verify()]);},
   mutate(names,operation){policy.allowMutationPaths(names);return io.closing(()=>original.mutate(names,operation),[()=>policy.verify()]);},
  });
  const first=materialization(await prepareFlatNativeOutputTextRetention({root:scope.root}),scope);scope.verify();policy.allow(first);
  // Independent original full production is retained. No public proposal,
  // source hash or policy DATA can replace genuine original source checking.
  const fresh=materialization(await prepareFlatNativeOutputTextRetention({root:scope.root}),scope);scope.verify();policy.allow(fresh);
  if(!sameOutputs(first,fresh))fail('complete fresh original producer output set differs');
  value={...sourceInstallation(fresh,scope),producerSchema:fresh.producerSchema,files:fresh.outputs.map(row=>row.path),protectedPolicyRetainedBytes:policy.retainedBytes};
 }catch(error){record(error);}
 // Attempt each independent closer, even after falsy/frozen primary failures.
 // Keep backup evidence and the original transaction recovery behavior.
 for(const close of [()=>scope?.verify(),()=>policy.close(),()=>original?.release()])try{close();}catch(error){record(error);}
 if(failed){if(secondary.length){let attached=false;if(primary!==null&&(typeof primary==='object'||typeof primary==='function'))try{Object.defineProperty(primary,'protectedFlatSourceClosingFailures',{value:secondary,enumerable:true});attached=true;}catch{}if(!attached)try{process.stderr.write('{"schema":"router-protected-flat-source-closing-20261102","closingFailed":true}\n');}catch{}}throw primary;}
 return value;
}

function sourceInstallation(fresh,scope){
 const root=fs.realpathSync(resolve(fresh.root)),rows=fresh.outputs,originals=new Map(),states=new Map(),written=[],installed=new Map(),artifacts=new Map(),external=[],unknownQuarantines=new Set();let directory=null,directoryIdentity=null,total=0;
 const id=io.identity,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const current=scope.current;
 const matches=(actual,expected)=>actual===null||expected===null?actual===expected:actual.source===expected.source&&actual.mode===expected.mode&&same(actual.identity,expected.identity);
 const exact=(name,expected)=>{if(!matches(current(name),expected))fail('source identity/bytes/mode changed: '+name);};
 const allowedPrivateNames=new Set();
 const ownDirectory=()=>{const stat=io.statFile(directory);if(!stat.isDirectory()||stat.isSymbolicLink()||!same(id(stat),directoryIdentity))fail('owned installation directory changed');for(const name of fs.readdirSync(directory))if(!allowedPrivateNames.has(name))fail('unknown private installation contents retained');};
 const privateRead=name=>{ownDirectory();return current(name);};
 const externalCheck=row=>{if(source(row.root,row.path)!==row.source)fail('external receiving producer source changed');const stat=row.source===null?null:io.statFile(physical(row.root,row.path));if(stat&&!same(id(stat),row.identity))fail('external receiving producer source identity/mode changed');};
 const originalCheck=()=>{scope.verify();for(const [name,expected]of originals)exact(name,installed.has(name)?installed.get(name):expected);for(const row of external)externalCheck(row);};
 if(!Array.isArray(rows)||rows.length!==FLAT_TARGETS.length||!Array.isArray(fresh.inputs)||fresh.inputs.length)fail('the complete internally reproduced flat target set required');
 for(const row of fresh.inputs){relative(row.path);const actual=current(row.path);if((actual?.source??null)!==row.source||originals.has(row.path)&&!matches(originals.get(row.path),actual))fail('inconsistent original source snapshots');originals.set(row.path,actual);total+=Buffer.byteLength(row.source??'');}
 for(const group of fresh.externalInputs??[]){if(!group||typeof group.root!=='string'||!Array.isArray(group.inputs)||external.length+group.inputs.length>4096)fail('bounded complete receiving source groups required');for(const row of group.inputs){relative(row.path);const sourceRoot=resolve(group.root),value=source(sourceRoot,row.path);if(value!==row.source)fail('external receiving source baseline differs');const stat=value===null?null:io.statFile(physical(sourceRoot,row.path));if((stat?stat.mode&0o777:null)!==row.mode)fail('external receiving source mode differs');external.push({root:sourceRoot,path:row.path,source:value,identity:stat?id(stat):null});total+=Buffer.byteLength(value??'');}}
 for(const row of rows){relative(row.path);if(states.has(row.path)||row.after!==null&&typeof row.after!=='string'||row.before!==null&&typeof row.before!=='string'||!Number.isInteger(row.mode)||row.mode<0||row.mode>0o777||row.after===null&&(row.before===null||row.inverse!==row.before))fail('complete unique output source/mode operation required');const actual=current(row.path);if((actual?.source??null)!==row.before||actual&&actual.mode!==row.mode)fail('complete original output bytes/mode differ');if(row.after!==null&&typeof row.after!=='string')fail('complete actual producer output source required');states.set(row.path,{row,before:actual,after:null});total+=Buffer.byteLength(row.before??'')+Buffer.byteLength(row.after??'');scope.registerOutput(row.path,actual);}
 const changed=[...states.values()].filter(state=>state.row.before!==state.row.after);originalCheck();for(const state of states.values())exact(state.row.path,state.before);if(!changed.length)return {schema:fresh.schema,baseRevision:fresh.baseRevision,changed:[],outputUtf8Occurrences:total,sourceAuthority:false,runtimeParity:false,rustExecuted:false};
 const privateName=name=>{allowedPrivateNames.add(name);return relative(fsRelative(directory)+'/'+name);},fsRelative=full=>{const value=full.slice(root.length+1);relative(value);return value;};
 const remember=(name,expected)=>{artifacts.set(name,expected);exact(name,expected);};
 const removePrivate=name=>{ownDirectory();const expected=artifacts.get(name);if(!expected)fail('unknown private installation artifact');exact(name,expected);scope.mutate([name],()=>fs.unlinkSync(physical(root,name)));artifacts.delete(name);for(const state of states.values()){const currentExpected=installed.has(state.row.path)?installed.get(state.row.path):state.before;if(currentExpected&&same(currentExpected.identity,expected.identity)){exact(state.row.path,currentExpected);scope.advance(state.row.path,currentExpected);}}};
 const capturePublic=(state,suffix)=>{
  ownDirectory();const name=privateName(suffix);if(current(name)!==null)fail('quarantine slot unexpectedly exists');unknownQuarantines.add(name);scope.mutate([state.row.path,name],()=>fs.renameSync(physical(root,state.row.path),physical(root,name)));scope.advance(state.row.path,null);const actual=privateRead(name);
  if(!matches(actual,state.before)&&!matches(actual,state.after)){
   // Restore only by no-overwrite link; unexpected captured data stays retained.
   if(actual)try{fs.linkSync(physical(root,name),physical(root,state.row.path));}catch{}fail('unexpected public replacement captured and retained');
  }artifacts.set(name,actual);unknownQuarantines.delete(name);return name;
 };
 const rollback=()=>{
  for(let index=written.length-1;index>=0;index--)try{
   const state=written[index],row=state.row,actual=current(row.path);ownDirectory();
   if(matches(actual,state.before)){scope.advance(row.path,state.before);installed.set(row.path,state.before);continue;}
   if(state.before&&(!state.backup||!artifacts.has(state.backup)))fail('original inode backup no longer available; current public output retained for partial recovery');
   if(actual!==null){if(!matches(actual,state.after))fail('external output replacement retained during rollback');capturePublic(state,'rollback-'+index);}
   if(state.before){exact(state.backup,state.before);scope.mutate([row.path],()=>fs.linkSync(physical(root,state.backup),physical(root,row.path)));scope.advance(row.path,state.before);exact(row.path,state.before);}else exact(row.path,null);installed.set(row.path,state.before);
  }catch(error){secondary.push(error);}
 };
 let primary,failed=false;const secondary=[];
 try{
  directory=resolve(root,'tools/.router-flat-source-install-'+randomUUID());const ownName=fsRelative(directory);scope.mutate([ownName],()=>fs.mkdirSync(directory,{mode:0o700}));fs.chmodSync(directory,0o700);directoryIdentity=id(io.statFile(directory));
  for(let index=0;index<changed.length;index++){
   const state=changed[index],row=state.row;ownDirectory();const parent=io.statFile(dirname(physical(root,row.path)));if(!parent.isDirectory()||parent.isSymbolicLink())fail('fixed original output parent must already exist');exact(row.path,state.before);
   if(state.before){const backup=privateName('backup-'+index);scope.mutate([backup],()=>fs.linkSync(physical(root,row.path),physical(root,backup)));scope.advance(row.path,state.before);state.backup=backup;remember(backup,state.before);}
   if(row.after!==null){const stage=privateName('stage-'+index);scope.mutate([stage],()=>io.writeText(physical(root,stage),row.after,row.mode,()=>{}));state.stage=stage;state.after=privateRead(stage);if(state.after.source!==row.after||state.after.mode!==row.mode)fail('complete prepared output readback differs');remember(stage,state.after);}
  }
  originalCheck();for(const state of states.values())exact(state.row.path,state.before);
  for(let index=0;index<changed.length;index++){
   const state=changed[index],row=state.row;originalCheck();exact(row.path,state.before);written.push(state);
   if(state.before){state.quarantine=capturePublic(state,'quarantine-'+index);installed.set(row.path,null);}
   if(row.after!==null){ownDirectory();scope.mutate([row.path],()=>fs.linkSync(physical(root,state.stage),physical(root,row.path)));scope.advance(row.path,state.after);installed.set(row.path,state.after);}else installed.set(row.path,null);
   exact(row.path,state.after);originalCheck();
  }
  originalCheck();for(const state of states.values())exact(state.row.path,state.row.before===state.row.after?state.before:state.after);
 }catch(error){failed=true;primary=error;
  rollback();
 }
 // Source/output closers run before and after each cleanup phase. The
 // original inode backups survive stage/quarantine cleanup and its full close.
 const closeInputs=()=>{const checks=[originalCheck];for(const state of states.values())checks.push(()=>exact(state.row.path,installed.has(state.row.path)?installed.get(state.row.path):state.before));return io.closing(()=>{},checks);};
 const recordFailure=error=>{if(!failed){failed=true;primary=error;}else secondary.push(error);};
 try{closeInputs();}catch(error){recordFailure(error);}
 if(failed){rollback();try{closeInputs();}catch(error){secondary.push(error);}}
 const backupNames=new Set(changed.map(state=>state.backup).filter(Boolean));
 const clean=names=>{for(const name of names){if(unknownQuarantines.size||secondary.length)break;try{removePrivate(name);}catch(error){recordFailure(error);break;}}};
 if(directory&&!failed){clean([...artifacts.keys()].filter(name=>!backupNames.has(name)));try{closeInputs();}catch(error){recordFailure(error);}if(failed){rollback();try{closeInputs();}catch(error){secondary.push(error);}}}
 // Once the original backup inode is removed, a later environmental failure
 // cannot promise inode-identical undo. Keep public after-state when an exact
 // backup is unavailable and persist full before-byte/mode copies separately.
 if(directory&&!failed){clean([...artifacts.keys()]);try{closeInputs();}catch(error){recordFailure(error);}}
 if(directory&&!failed)try{ownDirectory();if(fs.readdirSync(directory).length!==0)fail('unknown private installation state retained');scope.mutate([fsRelative(directory)],()=>fs.rmdirSync(directory));}catch(error){recordFailure(error);}
 if(!failed)try{closeInputs();}catch(error){recordFailure(error);}
 let partialInstallation=false;const copiedPreimages=[];
 if(failed){
  rollback();try{closeInputs();}catch(error){secondary.push(error);}
  for(const state of written)try{if(!matches(current(state.row.path),state.before))partialInstallation=true;}catch(error){partialInstallation=true;secondary.push(error);}
  if(partialInstallation)try{
   let present;try{present=io.statFile(directory);}catch(error){if(io.errorField(error,'code')!=='ENOENT')throw error;present=null;}
   if(!present){directory=resolve(root,'tools/.router-flat-source-install-'+randomUUID());allowedPrivateNames.clear();scope.mutate([fsRelative(directory)],()=>fs.mkdirSync(directory,{mode:0o700}));fs.chmodSync(directory,0o700);directoryIdentity=id(io.statFile(directory));}
   ownDirectory();
   for(let index=0;index<changed.length;index++){const state=changed[index];if(state.before===null)continue;const name=privateName('recovery-before-'+index);scope.mutate([name],()=>io.writeText(physical(root,name),state.before.source,state.before.mode,()=>{}));const actual=privateRead(name);if(actual.source!==state.before.source||actual.mode!==state.before.mode)fail('complete independent preimage recovery readback differs');remember(name,actual);copiedPreimages.push({path:state.row.path,copyPath:name,mode:state.before.mode,originalIdentity:state.before.identity,copyIdentity:actual.identity,kind:'exact-byte-mode-copy-not-original-inode'});}
  }catch(error){secondary.push(error);}
  // Unknown/corrupt/partial data is retained. Do not attempt broad deletion on
  // the failure path merely because a rollback happened to restore one peer.
 }
 const recoveryPaths=[];if(directory)try{if(fs.existsSync(directory))recoveryPaths.push(directory);}catch(error){secondary.push(error);}
 if(failed){let attached=false;if(primary&&typeof primary==='object')try{Object.defineProperties(primary,{rollbackFailures:{value:secondary,enumerable:true},recoveryPaths:{value:recoveryPaths,enumerable:true},partialInstallation:{value:partialInstallation,enumerable:true},copiedPreimages:{value:copiedPreimages,enumerable:true}});attached=true;}catch{}if(recoveryPaths.length&&!attached)try{process.stderr.write(JSON.stringify({schema:'router-source-installation-recovery-paths-v1',recoveryPaths,partialInstallation,copiedPreimages})+'\n');}catch{}throw primary;}
 if(secondary.length){const error=new AggregateError(secondary,'Guarded source installation closing/cleanup failures');error.recoveryPaths=recoveryPaths;throw error;}return {schema:fresh.schema,baseRevision:fresh.baseRevision,changed:changed.map(state=>state.row.path),outputUtf8Occurrences:total,sourceAuthority:false,runtimeParity:false,rustExecuted:false};
}
