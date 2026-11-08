import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,symlinkSync,rmSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Hash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareConcreteEquationTransaction,isConcreteEquationPhysicalSourceMismatch} from '../prepare-concrete-equation-transaction.mjs';
import {composePrivateParserEquationSourceHistory} from '../private-parser-equation-source-history.mjs';

const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/';
const ARCHIVE=BASE+'source-profiles/concrete-equation-transaction/complete-originals.json.gz',EXECUTOR=BASE+'private-parser-execution.mjs';
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-equation-refusal-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 for(const path of [ARCHIVE,BASE+'prepare-concrete-equation-transaction.mjs',BASE+'private-parser-equation-source-history.mjs']){mkdirSync(dirname(resolve(root,path)),{recursive:true});copyFileSync(resolve(ROOT,path),resolve(root,path));}
 symlinkSync(resolve(ROOT,'js'),resolve(root,'js'),'dir');
 const packed=readFileSync(resolve(root,ARCHIVE)),originals=JSON.parse(gunzipSync(packed).toString('utf8'));
 for(const row of originals.files){mkdirSync(dirname(resolve(root,row.path)),{recursive:true});writeFileSync(resolve(root,row.path),row.source);}
 const original=originals.files.find(row=>row.path===EXECUTOR),source=original.source+'\n// unissued physical source\n';writeFileSync(resolve(root,EXECUTOR),source);
 return {root,packed,row:{path:EXECUTOR,after:original.source},input:{path:EXECUTOR,source}};
}

test('actual physical-source refusal retains the producer diagnostic and the history API diagnostic',{timeout:60000},t=>{
 const {root,row,input}=fixture(t);let producerError;
 assert.throws(()=>prepareConcreteEquationTransaction({root}),error=>{producerError=error;return error instanceof TypeError&&isConcreteEquationPhysicalSourceMismatch(error)&&error.message==='Concrete equation transaction: physical source differs from exact original/successor: '+EXECUTOR;});
 assert.throws(()=>composePrivateParserEquationSourceHistory(row,input,{root}),error=>error instanceof TypeError&&error.message==='Private DATA source history: physical source is neither exact historical nor exact adopted equation: '+EXECUTOR&&isConcreteEquationPhysicalSourceMismatch(error.cause)&&error.cause.message===producerError.message);
});

test('copied proxy getter and primitive errors cannot impersonate the producer refusal',{timeout:60000},t=>{
 const {root}=fixture(t);let original;assert.throws(()=>prepareConcreteEquationTransaction({root}),error=>{original=error;return isConcreteEquationPhysicalSourceMismatch(error);});
 let reads=0;const accessor={};Object.defineProperty(accessor,'message',{get(){reads++;throw Error('message getter invoked');}});
 const proxy=new Proxy(original,{get(){reads++;throw Error('proxy getter invoked');},getPrototypeOf(){reads++;throw Error('proxy prototype invoked');}});
 const copy=Object.create(Object.getPrototypeOf(original),Object.getOwnPropertyDescriptors(original));
 for(const error of [copy,proxy,accessor,new TypeError(original.message),undefined,null,true,1,'physical source differs'])assert.equal(isConcreteEquationPhysicalSourceMismatch(error),false);
 const has=Object.getOwnPropertyDescriptor(WeakSet.prototype,'has');try{Object.defineProperty(WeakSet.prototype,'has',{...has,value(){return true;}});assert.equal(isConcreteEquationPhysicalSourceMismatch(copy),false);assert.equal(isConcreteEquationPhysicalSourceMismatch(original),true);}finally{Object.defineProperty(WeakSet.prototype,'has',has);}
 assert.equal(reads,0);
});

test('a genuine Hash callback exception is propagated unchanged rather than relabeled',{timeout:60000},t=>{
 const {root,row,input,packed}=fixture(t),update=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),sentinel=new TypeError('Concrete equation transaction: physical source differs from exact original/successor: '+EXECUTOR);let invoked=false;
 try{Object.defineProperty(Hash.prototype,'update',{...update,value:function(...args){if(Buffer.isBuffer(args[0])&&args[0].equals(packed)){invoked=true;throw sentinel;}return Reflect.apply(update.value,this,args);}});assert.throws(()=>composePrivateParserEquationSourceHistory(row,input,{root}),error=>error===sentinel);}finally{Object.defineProperty(Hash.prototype,'update',update);}
 assert.equal(invoked,true);assert.equal(isConcreteEquationPhysicalSourceMismatch(sentinel),false);
});
