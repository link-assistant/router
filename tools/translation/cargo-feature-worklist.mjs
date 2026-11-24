// Reusable language-phase substitutions over already authenticated Cargo records.
// Sources and profile selection remain the caller's independent responsibility;
// an active feature set supplies no compiler configuration or namespace authority.
// Preserve worklist order, conservative target union and delayed weak forwarding.
export function activateCargoFeatureRecords(readRoot,packages,{label='Cargo'}={}) {
  const active=new Map(),depActive=new Set(),queue=[];
  const activate=(name,feature=null)=>{if(!packages.has(name))return;if(!active.has(name)){active.set(name,new Set());queue.push([name,null]);}if(feature!==null&&!active.get(name).has(feature)){active.get(name).add(feature);queue.push([name,feature]);}};
  const dependency=(owner,entry)=>{
    const key=owner.name+':'+entry.alias;if(depActive.has(key))return;depActive.add(key);
    activate(entry.package);if(entry.defaultFeatures)activate(entry.package,'default');for(const feature of entry.features)activate(entry.package,feature);
  };
  activate(readRoot());activate(readRoot(),'default');let steps=0;
  for(let at=0;at<queue.length;at++) {
    if(++steps>4096)throw new TypeError(label+' dependency feature activation budget exceeded');
    const [name,feature]=queue[at],owner=packages.get(name),dependencies_=owner.dependencies.filter(entry=>entry.kind==='dependencies');
    if(feature===null){for(const entry of dependencies_)if(!entry.optional)dependency(owner,entry);continue;}
    const values=owner.features[feature];
    if(!values){const implicit=dependencies_.find(entry=>entry.alias===feature&&entry.optional);if(implicit)dependency(owner,implicit);else if(feature!=='default'&&!owner.unrelatedDependencyAliases.includes(feature))throw new TypeError('Unregistered original Cargo feature '+name+'/'+feature);continue;}
    for(const value of values) {
      if(typeof value!=='string')throw new TypeError('Unproved Cargo feature syntax');
      if(value.startsWith('dep:')){const entry=dependencies_.find(entry=>entry.alias===value.slice(4));if(entry)dependency(owner,entry);continue;}
      const slash=value.indexOf('/');
      if(slash>=0){const raw=value.slice(0,slash),weak=raw.endsWith('?'),alias=weak?raw.slice(0,-1):raw,entry=dependencies_.find(entry=>entry.alias===alias);if(!entry)continue;if(!weak||depActive.has(name+':'+alias)){dependency(owner,entry);activate(entry.package,value.slice(slash+1));}continue;}
      activate(name,value);
    }
    // A newly enabled optional dependency may unlock an earlier weak edge.
    for(const enabled of active.get(name))for(const value of owner.features[enabled]??[])if(value.includes('?/')){const [alias,target]=value.split('?/'),entry=dependencies_.find(entry=>entry.alias===alias);if(entry&&depActive.has(name+':'+alias))activate(entry.package,target);}
  }
  return active;
}
