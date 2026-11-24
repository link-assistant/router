// Bounded operational shutdown only. Never starts a child or grants Rust access.
// Inputs are private call-site ChildProcess objects, not semantic permits.
export async function closeNativeOracleChild(child,promises,{timeoutMs=2000}={}){
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)throw new TypeError('Bounded native child shutdown required');
 let timer=null;const errors=[];let childExitConfirmed=child.exitCode!==undefined&&child.exitCode!==null||child.signalCode!==undefined&&child.signalCode!==null;
 let observeClose;const closed=childExitConfirmed?Promise.resolve():new Promise(resolve=>{observeClose=()=>{childExitConfirmed=true;resolve();};child.once('close',observeClose);});
 for(const stream of [child.stdin,child.stdout,child.stderr])if(stream)try{stream.destroy();}catch(error){errors.push(error);}
 try{child.kill('SIGKILL');}catch(error){errors.push(error);}
 const settled=Promise.allSettled([...promises,closed]);let complete=false;try{complete=await Promise.race([settled.then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs);})]);}finally{if(timer!==null)clearTimeout(timer);if(observeClose)child.off('close',observeClose);}
 const shutdownSettled=complete&&childExitConfirmed&&errors.length===0;
 if(!shutdownSettled)try{child.unref();}catch(error){errors.push(error);}
 // Root close is not a proof that every descendant exited. Workspace deletion
 // still requires the independent complete source/receiving closing protocol.
 return Object.freeze({shutdownSettled,childExitConfirmed,descendantExitProved:false,unconfirmedPid:shutdownSettled?null:child.pid??null,cleanupAllowed:false,sourceClosingStillRequired:true,errors:Object.freeze(errors)});
}
