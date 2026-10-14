#!/usr/bin/env python3
"""Recover exact complete evidence archives from reachable immutable Git bytes."""
import argparse
import hashlib
import io
import json
import os
import lzma
from pathlib import Path
import re
import subprocess
import tarfile
import time

PREFIX='docs/case-studies/issue-759/'
MAX_ARCHIVE=256*1024*1024
MAX_MEMBER=128*1024*1024
MAX_TOTAL=1024*1024*1024

def relative(name):
    if not isinstance(name,str) or not name or '\\' in name or '\x00' in name or name.startswith('/') or any(p in ['', '.', '..'] for p in name.split('/')):
        raise ValueError('Packet requires a canonical relative path')
    return name

def canonical(path):
    path=Path(path).absolute()
    for alias in [Path('/tmp'),Path('/var')]:
        if alias.is_symlink() and path.is_relative_to(alias):return alias.resolve()/path.relative_to(alias)
    return path

def plain(path,missing=False):
    path=canonical(path)
    for part in [path,*path.parents]:
        if part.is_symlink():raise ValueError('Linked packet paths refused')
    if missing and not path.exists():return None
    if not path.is_file():raise ValueError('Packet requires a regular file')
    return path.stat()

def pairs(rows):
    result={}
    for key,value in rows:
        if key in result:raise ValueError('Duplicate packet index key')
        result[key]=value
    return result

def digest(value,length=64):
    if not isinstance(value,str) or not re.fullmatch('[a-f0-9]{'+str(length)+'}',value):raise ValueError('Invalid packet digest')
    return value

def size(value,maximum):
    if type(value) is not int or not 0<=value<=maximum:raise ValueError('Packet byte bound exceeded')
    return value

class DecodedArchive(io.RawIOBase):
    def __init__(self,stream,check):
        self.stream,self.check=stream,check;self.decoder=lzma.LZMADecompressor(memlimit=128*1024*1024);self.pending=b'';self.total=0;self.finished=False
    def readable(self):return True
    def readinto(self,buffer):
        while not self.pending and not self.finished:
            self.check()
            chunk=self.stream.read(65536) if self.decoder.needs_input else b''
            if not chunk and self.decoder.needs_input:raise ValueError('Truncated packet compression stream')
            data=self.decoder.decompress(chunk,max_length=1024*1024);self.total+=len(data)
            if self.total>MAX_TOTAL+8192*2048:raise ValueError('Expanded packet byte bound exceeded')
            self.pending=data
            if self.decoder.eof:
                if self.decoder.unused_data or self.stream.read(1):raise ValueError('Extra packet compression stream')
                self.finished=True
        count=min(len(buffer),len(self.pending));buffer[:count]=self.pending[:count];self.pending=self.pending[count:];return count

class PacketStore:
    def __init__(self,case_root,repository_root,index='packet-git-index.json',cap_seconds=120):
        if type(cap_seconds) is not int or not 1<=cap_seconds<=600:raise ValueError('Invalid packet deadline')
        self.deadline=time.monotonic()+cap_seconds
        self.root=canonical(case_root);self.repository=canonical(repository_root)
        for root in [self.root,self.repository]:
            if not root.is_dir() or any(p.is_symlink() for p in [root,*root.parents]):raise ValueError('Linked or missing packet root')
        if Path(self.git('rev-parse','--show-toplevel').decode().strip()).resolve()!=self.repository:raise ValueError('Foreign Git packet repository root')
        path=self.root/relative(index);state=plain(path)
        if state.st_size>4*1024*1024:raise ValueError('Packet index too large')
        data=json.loads(path.read_bytes(),object_pairs_hook=pairs)
        if set(data)!= {'schema','archives'} or data['schema']!='complete-packet-git-index-v1' or not isinstance(data['archives'],dict) or not 1<=len(data['archives'])<=64:raise ValueError('Malformed packet index')
        self.archives={}
        for name,row in data['archives'].items():
            relative(name)
            if not isinstance(row,dict) or set(row)!= {'bytes','sha256','git'}:raise ValueError('Malformed packet witness')
            size(row['bytes'],MAX_ARCHIVE);digest(row['sha256']);witness=row['git']
            if not isinstance(witness,dict) or set(witness)!= {'commit','path','blob'}:raise ValueError('Malformed Git packet witness')
            digest(witness['commit'],40);digest(witness['blob'],40)
            if witness['path']!=PREFIX+name:raise ValueError('Escaping or foreign Git packet path')
            self.archives[name]=(row['bytes'],row['sha256'],tuple(witness[k] for k in ['commit','path','blob']))

    def environment(self):
        env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')}
        env.update(GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1',GIT_CONFIG_NOSYSTEM='1',GIT_CONFIG_GLOBAL=os.devnull)
        return env

    def check(self):
        if time.monotonic()>self.deadline:raise TimeoutError('Packet deadline exceeded')

    def git(self,*args):
        self.check()
        result=subprocess.run(['git',*args],cwd=self.repository,env=self.environment(),capture_output=True,timeout=min(30,max(1,self.deadline-time.monotonic())))
        if result.returncode:raise ValueError('Missing or invalid immutable Git packet witness')
        return result.stdout

    def verified_archive(self,name):
        """Stage only compressed bytes; no expanded report or TAR member files."""
        import tempfile
        relative(name)
        if name not in self.archives:raise ValueError('Missing declared packet archive')
        length,expected,(commit,path,blob)=self.archives[name]
        if self.git('rev-parse','--verify',commit+'^{commit}').decode().strip()!=commit:raise ValueError('Packet commit mismatch')
        self.git('merge-base','--is-ancestor',commit,'HEAD')
        entry=self.git('ls-tree',commit,'--',path).decode().strip().split('\t')
        if len(entry)!=2 or entry[1]!=path or entry[0] not in ['100644 blob '+blob,'100755 blob '+blob]:raise ValueError('Packet blob/mode mismatch')
        if self.git('cat-file','-t',blob).decode().strip()!='blob' or int(self.git('cat-file','-s',blob))!=length:raise ValueError('Packet blob type/length mismatch')
        target=tempfile.SpooledTemporaryFile(max_size=1024*1024,mode='w+b');process=None
        try:
            process=subprocess.Popen(['git','cat-file','blob',blob],cwd=self.repository,env=self.environment(),stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
            total=0;actual=hashlib.sha256()
            while chunk:=process.stdout.read(1024*1024):
                self.check();total+=len(chunk)
                if total>length:raise ValueError('Packet Git bytes exceed declaration')
                actual.update(chunk);target.write(chunk)
            if process.wait(timeout=min(30,max(1,self.deadline-time.monotonic())))!=0 or total!=length or actual.hexdigest()!=expected:raise ValueError('Packet complete Git byte/hash mismatch')
            physical=self.root/name
            if plain(physical,missing=True) is not None:
                actual=hashlib.sha256();total=0
                with physical.open('rb') as stream:
                    while chunk:=stream.read(1024*1024):self.check();total+=len(chunk);actual.update(chunk)
                if total!=length or actual.hexdigest()!=expected:raise ValueError('Physical packet differs from immutable Git')
            target.seek(0);return target
        except BaseException:
            target.close()
            if process and process.poll() is None:process.kill();process.wait()
            raise
        finally:
            if process and process.stdout:process.stdout.close()

    def verify_members(self,name,members):
        if not isinstance(members,list) or not 1<=len(members)<=8192:raise ValueError('Invalid complete packet member inventory')
        expected={};total=0
        for row in members:
            if not isinstance(row,dict) or not {'path','bytes','sha256'}<=set(row):raise ValueError('Malformed packet member')
            path=relative(row['path']);length=size(row['bytes'],MAX_MEMBER);digest(row['sha256']);total+=length
            if path in expected or total>MAX_TOTAL:raise ValueError('Duplicate or oversized complete packet inventory')
            expected[path]=(length,row['sha256'])
        seen={};decoded=0
        with self.verified_archive(name) as archive,io.BufferedReader(DecodedArchive(archive,self.check)) as decoded_stream,tarfile.open(fileobj=decoded_stream,mode='r|') as tar:
            for member in tar:
                self.check();path=relative(member.name)
                if path not in expected or path in seen:raise ValueError('Extra or duplicate packet member')
                if member.islnk():
                    linked=relative(member.linkname)
                    if linked not in seen or expected[path]!=seen[linked] or member.size!=0:raise ValueError('Invalid packet backward hardlink')
                    fact=seen[linked]
                elif member.isfile():
                    if member.size!=expected[path][0]:raise ValueError('Packet member declared length mismatch')
                    stream=tar.extractfile(member);count=0;actual=hashlib.sha256()
                    while chunk:=stream.read(1024*1024):self.check();count+=len(chunk);actual.update(chunk)
                    fact=(count,actual.hexdigest())
                    if fact!=expected[path]:raise ValueError('Packet complete member byte/hash mismatch')
                else:raise ValueError('Packet symlink or nonregular member refused')
                seen[path]=fact;decoded+=fact[0]
            if any(tar.fileobj.buf):raise ValueError('Extra packet TAR trailer data')
            while trailer:=decoded_stream.read(65536):
                self.check()
                if any(trailer):raise ValueError('Extra packet TAR trailer data')
        if set(seen)!=set(expected):raise ValueError('Missing complete packet member')
        return {'archive':name,'completeMembers':len(seen),'completeOriginalBytes':decoded,'allDecodedOriginalsVerified':True,'runtimeParity':False,'semanticAuthority':False}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--case-root',required=True);parser.add_argument('--repository-root',required=True);parser.add_argument('--index',default='packet-git-index.json');parser.add_argument('--packet',required=True);parser.add_argument('--members-receipt',required=True);parser.add_argument('--cap-seconds',type=int,default=120);parser.add_argument('--copy-to')
    args=parser.parse_args();path=Path(args.members_receipt);plain(path)
    if path.stat().st_size>16*1024*1024:raise ValueError('Packet receipt too large')
    import gzip
    raw=path.read_bytes();raw=gzip.GzipFile(fileobj=io.BytesIO(raw)).read(16*1024*1024+1) if path.suffix=='.gz' else raw
    if len(raw)>16*1024*1024:raise ValueError('Decoded packet receipt too large')
    members=json.loads(raw,object_pairs_hook=pairs)['members'];store=PacketStore(args.case_root,args.repository_root,args.index,args.cap_seconds);report=store.verify_members(args.packet,members)
    if args.copy_to:
        output=canonical(args.copy_to)
        if any(p.is_symlink() for p in [output,*output.parents]):raise ValueError('Linked packet recovery output refused')
        with store.verified_archive(args.packet) as source,output.open('xb') as target:
            while chunk:=source.read(1024*1024):store.check();target.write(chunk)
        report['completeArchiveRecoveredTo']=str(output)
    print(json.dumps(report))

if __name__=='__main__':main()
