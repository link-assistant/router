// Explicit analysis profiles do not replace the platform-neutral baseline or
// establish completeness for all Rust targets, Cargo features or build modes.
import {createHash} from 'node:crypto';
import {compilationProfile,PRODUCTION_PROFILE} from './cfg-profile.mjs';

const contexts=new WeakMap();
const compare=(a,b)=>a<b?-1:a>b?1:0;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function normalized(input){
  const profile=compilationProfile(input);
  if(profile===null)throw new TypeError('matrix members require an explicit compilation profile');
  return freeze({schemaVersion:1,flags:Object.fromEntries(Object.entries(profile.flags).sort(([a],[b])=>compare(a,b))),values:Object.fromEntries(Object.entries(profile.values).sort(([a],[b])=>compare(a,b))),closedKeys:profile.closedKeys});
}
const neutral=normalized(PRODUCTION_PROFILE),neutralDigest=digest(neutral);
export const DECLARED_FAMILY_PROFILES=freeze([
  {name:'neutral',compilationProfile:neutral},
  {name:'unix-family',compilationProfile:normalized({flags:{test:false,unix:true,windows:false}})},
  {name:'windows-family',compilationProfile:normalized({flags:{test:false,unix:false,windows:true}})},
]);

export function createCompilationMatrix({profiles,requiredProfiles}={}){
  if(!Array.isArray(profiles)||profiles.length<1||profiles.length>16)throw new TypeError('matrix needs one to sixteen explicitly selected profiles');
  const names=new Set(),digests=new Set();
  const members=profiles.map(member=>{
    const name=member?.name;
    if(typeof name!=='string'||!(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/).test(name)||name.length>64||['runtime','manifest','index','common'].includes(name))throw new TypeError('profile name must be a safe nonreserved directory identifier');
    if(names.has(name))throw new TypeError('duplicate profile directory identifier');names.add(name);
    const compilationProfile=normalized(member.compilationProfile),sha256=digest(compilationProfile);
    if(digests.has(sha256))throw new TypeError('duplicate normalized profile identity');digests.add(sha256);
    if(name==='neutral'&&sha256!==neutralDigest||name!=='neutral'&&sha256===neutralDigest)throw new TypeError('reserved neutral identity must retain the platform-neutral production profile');
    if(name==='unix-family'&&(compilationProfile.flags.unix!==true||compilationProfile.flags.windows!==false)||name==='windows-family'&&(compilationProfile.flags.windows!==true||compilationProfile.flags.unix!==false))throw new TypeError('family profile names require their explicit mutually exclusive family flags');
    return freeze({name,sha256,compilationProfile,directory:`profiles/${name}-${sha256}`});
  }).sort((a,b)=>compare(a.name,b.name));
  if(!names.has('neutral'))throw new TypeError('matrix must preserve neutral baseline evidence');
  const required=requiredProfiles===undefined?members.map(member=>member.name):requiredProfiles;
  if(!Array.isArray(required)||!required.includes('neutral')||required.some(name=>!names.has(name))||new Set(required).size!==required.length)throw new TypeError('required profiles must be unique selected names including neutral');
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
