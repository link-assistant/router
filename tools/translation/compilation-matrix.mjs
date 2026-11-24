// Explicit analysis profiles do not replace the platform-neutral baseline or
// establish completeness for all Rust targets, Cargo features or build modes.
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {compilationProfile,PRODUCTION_PROFILE} from './cfg-profile.mjs';

const contexts=new WeakMap();
const compare=(a,b)=>a<b?-1:a>b?1:0;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function dataRecord(value,allowed){
  if(!value||typeof value!=='object'||utilTypes.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new TypeError('matrix selection requires plain descriptor-only records');
  const result=Object.create(null);
  for(const key of Reflect.ownKeys(value)){
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||!allowed.includes(key)||!descriptor.enumerable||!('value' in descriptor))throw new TypeError('matrix selection requires known enumerable data descriptors');
    result[key]=descriptor.value;
  }
  return result;
}
function selectionArray(value){
  if(!value||utilTypes.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw new TypeError('profile selections require ordinary data arrays');
  const length=Object.getOwnPropertyDescriptor(value,'length').value,result=[];
  if(length>16)throw new TypeError('profile selection budget exceeds sixteen');
  for(const key of Reflect.ownKeys(value))if(key!=='length'&&(typeof key!=='string'||!(/^(0|[1-9][0-9]*)$/).test(key)||Number(key)>=length))throw new TypeError('profile selection arrays cannot contain incidental properties');
  for(let index=0;index<length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,String(index));if(!descriptor||!('value'in descriptor)||!descriptor.enumerable)throw new TypeError('profile selection arrays require dense data descriptors');result.push(descriptor.value);}
  return result;
}
function normalized(input){
  const profile=compilationProfile(dataRecord(input,['schemaVersion','flags','values','closedKeys']));
  if(profile===null)throw new TypeError('matrix members require an explicit compilation profile');
  return freeze({schemaVersion:1,flags:Object.fromEntries(Object.entries(profile.flags).sort(([a],[b])=>compare(a,b))),values:Object.fromEntries(Object.entries(profile.values).sort(([a],[b])=>compare(a,b))),closedKeys:profile.closedKeys});
}
const neutral=normalized(PRODUCTION_PROFILE),neutralDigest=digest(neutral);
export const DECLARED_FAMILY_PROFILES=freeze([
  {name:'neutral',compilationProfile:neutral},
  {name:'unix-family',compilationProfile:normalized({flags:{test:false,unix:true,windows:false}})},
  {name:'windows-family',compilationProfile:normalized({flags:{test:false,unix:false,windows:true}})},
]);

export function createCompilationMatrix(input={}){
  const {profiles:profileInput,requiredProfiles}=dataRecord(input,['profiles','requiredProfiles']),profiles=selectionArray(profileInput);
  if(!profiles.length)throw new TypeError('matrix needs one to sixteen explicitly selected profiles');
  const names=new Set(),digests=new Set();
  const members=profiles.map(inputMember=>{
    const member=dataRecord(inputMember,['name','compilationProfile']),name=member.name;
    if(typeof name!=='string'||!(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/).test(name)||name.length>64||['runtime','manifest','index','common'].includes(name))throw new TypeError('profile name must be a safe nonreserved directory identifier');
    if(names.has(name))throw new TypeError('duplicate profile directory identifier');names.add(name);
    const compilationProfile=normalized(member.compilationProfile),sha256=digest(compilationProfile);
    if(digests.has(sha256))throw new TypeError('duplicate normalized profile identity');digests.add(sha256);
    if(name==='neutral'&&sha256!==neutralDigest||name!=='neutral'&&sha256===neutralDigest)throw new TypeError('reserved neutral identity must retain the platform-neutral production profile');
    if(name==='unix-family'&&(compilationProfile.flags.unix!==true||compilationProfile.flags.windows!==false)||name==='windows-family'&&(compilationProfile.flags.windows!==true||compilationProfile.flags.unix!==false))throw new TypeError('family profile names require their explicit mutually exclusive family flags');
    return freeze({name,sha256,compilationProfile,directory:`profiles/${name}-${sha256}`});
  }).sort((a,b)=>compare(a.name,b.name));
  if(!names.has('neutral'))throw new TypeError('matrix must preserve neutral baseline evidence');
  const required=requiredProfiles===undefined?members.map(member=>member.name):selectionArray(requiredProfiles);
  if(!required.includes('neutral')||required.some(name=>!names.has(name))||new Set(required).size!==required.length)throw new TypeError('required profiles must be unique selected names including neutral');
  const description=freeze({schemaVersion:1,kind:'explicit-compilation-profile-matrix',profiles:members,requiredProfiles:[...required].sort(),platformDomainComplete:false,runtimeParity:false});
  const token=freeze({...description,sha256:digest(description)});contexts.set(token,description);return token;
}

export function compilationMatrixDescription(matrix){
  const description=contexts.get(matrix);
  if(!description)throw new TypeError('requires an original explicit compilation matrix');
  return description;
}

export function profileRelativePath(matrix,name,relative){
  const member=compilationMatrixDescription(matrix).profiles.find(profile=>profile.name===name);
  if(!member)throw new TypeError('profile is not a member of this matrix');
  if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes('\0')||relative.includes(':')||relative.split('/').some(part=>!part||part==='.'||part==='..'))throw new TypeError('profile output must be a safe relative path');
  return `${member.directory}/${relative}`;
}
