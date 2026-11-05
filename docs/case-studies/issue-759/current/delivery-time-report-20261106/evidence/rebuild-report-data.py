# Metadata/report authoring only; no test, compiler or translator imports.
from pathlib import Path
from datetime import datetime,timezone
import json,math,statistics,collections
import argparse
parser=argparse.ArgumentParser(description='Rebuild frozen report metadata from read-only Git TSV exports; no application code executes.')
parser.add_argument('--input-directory',required=True,type=Path)
parser.add_argument('--output-directory',type=Path,default=Path(__file__).resolve().parent.parent)
args=parser.parse_args();root=args.output_directory;e=root/'evidence';e.mkdir(parents=True,exist_ok=True)
head='5fa93ebf9e2b7b402338bb186c196b4a90e76bfe';audit='ba7b1d9f99f9be16628fe433a097b1b8ff036f43'
def load(path):
 out=[]
 for line in Path(path).read_text().splitlines():
  h,a,c,p,s=line.split('\t',4);out.append(dict(sha=h,authorTime=a,committerTime=c,parents=p.split(),subject=s))
 return out
def dt(r):return datetime.fromisoformat(r['committerTime'])
def utc(r):return dt(r).astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
def category(s):
 s=s.lower()
 if s.startswith('merge '):return 'MERGE'
 if 'handoff' in s or 'audit' in s or 'forecast' in s or 'checkpoint' in s or 'guidance' in s or s.startswith('docs') or 'receipt' in s and ('record' in s or 'close' in s):return 'REPORT'
 if any(w in s for w in ['ci:', 'ci)', 'workflow','gate outcome','fatal rust','failure collect','native oracle','oracle','independent','regression','test:']):return 'CASE_GATE'
 if any(w in s for w in ['custody','history','histories','ancestry','source bank','source-bank','source profile','source-profile','closing','poison','source reader','source-reader','successor','source transport','source-transport','source fence','source-fence','source writer','source-writer']):return 'SOURCE_HISTORY'
 if any(w in s for w in ['synchron','sync ','flat output','flat storage','publication','installer','atomic','rollback','source policy','source-policy']):return 'SYNC_STORAGE'
 if any(w in s for w in ['export','receiving','layout','provenance','license','source inventory','scope inventory','source census','source ownership']):return 'SCOPE_DELIVERY'
 return 'LANGUAGE_RUNTIME'
allrows=load(args.input_directory/'router-task-commits-20261106.tsv');allrows.sort(key=lambda r:(dt(r),r['sha']))
fp=list(reversed(load(args.input_directory/'router-task-first-parent-20261106.tsv')))
bysha={r['sha']:r for r in allrows}
for r in allrows:r['inferredWorkClass']=category(r['subject']);r['classificationBasis']='commit subject only; not causal time attribution'
for i,r in enumerate(allrows):
 r['chronologicalPreviousSha']=allrows[i-1]['sha'] if i else None
 r['chronologicalGapSeconds']=(dt(r)-dt(allrows[i-1])).total_seconds() if i else None
 parent=bysha.get(r['parents'][0]) if r['parents'] else None
 r['firstParentGapSeconds']=(dt(r)-dt(parent)).total_seconds() if parent else None
 r['firstParentInsidePopulation']=parent is not None
for i in range(0,len(allrows),250):
 (e/f'commits-{i//250+1:02}.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n' for r in allrows[i:i+250]))
(e/'first-parent.jsonl').write_text(''.join(json.dumps({'sha':r['sha'],'committerTime':r['committerTime']},separators=(',',':'))+'\n' for r in fp))
def stats(rr):
 ss=sorted(rr,key=lambda r:(dt(r),r['sha']));g=[(dt(b)-dt(a)).total_seconds() for a,b in zip(ss,ss[1:])];p=sorted(x for x in g if x>0)
 return dict(commits=len(ss),firstSha=ss[0]['sha'],lastSha=ss[-1]['sha'],firstUTC=utc(ss[0]),lastUTC=utc(ss[-1]),spanHours=(dt(ss[-1])-dt(ss[0])).total_seconds()/3600,medianPositiveGapMinutes=statistics.median(p)/60,p90PositiveGapMinutes=p[math.ceil(.9*len(p))-1]/60,maxGapHours=max(g)/3600,sameTimestampGaps=g.count(0),gapsOver6Hours=sum(x>21600 for x in g),mergeCommits=sum(len(r['parents'])>1 for r in ss))
phases={name:load(args.input_directory/('router-phase-'+name+'-20261106.tsv')) for name in ['761','771','775']}
continuation=phases['775'];since=[r for r in continuation if dt(r)>dt(bysha[audit])]
metrics={'frozenHead':head,'reportLocalDate':'2026-11-06','timezone':'Asia/Ho_Chi_Minh','timestampsDisplayed':'UTC','population':'07901ad24576e7f045270fe62ac56f8a72446c53^1..5fa93ebf9e2b7b402338bb186c196b4a90e76bfe','quantileMethod':'nearest rank of strictly positive chronological committer gaps','allTaskAncestry':stats(allrows),'firstParentIntegration':stats(fp),'currentContinuation':stats(continuation),'afterNovember1Audit':stats(since),'phaseStats':{k:stats(v) for k,v in phases.items()},'dailyFirstParentCounts':dict(sorted(collections.Counter(dt(r).astimezone(timezone.utc).date().isoformat() for r in fp).items())),'firstParentSubjectClasses':dict(collections.Counter(category(r['subject']) for r in fp)),'allSubjectClasses':dict(collections.Counter(r['inferredWorkClass'] for r in allrows)),'verification':'UNRUN','ci':'NOT_INSPECTED','developerActiveTime':'UNKNOWN','actualFeatureThroughput':'UNKNOWN'}
(e/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
# Human-readable per-checkpoint appendix: original merged branch commits remain
# individually enumerated in JSONL; first-parent gaps across merges are explicit.
for start in range(0,len(fp),200):
 lines=[f'# Integration steps {start+1}–{min(start+200,len(fp))}', '', 'Frozen head `'+head+'`. All times UTC. Gap is from the preceding', 'first-parent integration record, including records on the preceding page.', 'It is checkpoint spacing, not active implementation time. MERGE gaps can', 'hide substantial branch work; see the complete ancestry JSONL evidence.', 'Work classes are title-based hypotheses explained in [the report](../README.md#why-the-steps-took-time).', '', '| Step | Commit | UTC committed | Gap | Work class | Recorded step |','| ---: | --- | --- | --- | --- | --- |']
 for i in range(start,min(start+200,len(fp))):
  r=fp[i];sec=(dt(r)-dt(fp[i-1])).total_seconds() if i else None
  gap='boundary: unknown' if sec is None else f'{int(sec)//3600}h {int(sec)%3600//60:02}m {int(sec)%60:02}s'
  title=r['subject'].replace('|','\\|').replace('`',"'")
  lines.append(f"| {i+1} | [{r['sha'][:9]}](https://github.com/link-assistant/router/commit/{r['sha']}) | {utc(r)} | {gap} | {category(r['subject'])} | {title} |")
 (root/'steps').mkdir(exist_ok=True);(root/'steps'/f'{start//200+1:02}.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(metrics,indent=2))
