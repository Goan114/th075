"""Encode TH075's original PCM to OGG with exact loop and sample counts."""
from pathlib import Path
import json,struct,hashlib,sys
workspace=Path(__file__).resolve().parents[2];project=workspace/'th075_web'
sys.path.insert(0,str(workspace/'tools/architecture/python'))
import soundfile as sf
import numpy as np
source=project/'reference/assets/th075bgm.dat/wave/bgm';out=project/'assets/music';out.mkdir(parents=True,exist_ok=True)
rows=[];binary=bytearray()
for path in sorted(source.glob('*.wav')):
 name=path.stem
 cue=40 if name=='sys00_op' else 41 if name=='sys99_ed' else int(name[:-1])+{'a':0,'b':10,'c':20}[name[-1]] if name[-1] in 'abc' else int(name)
 data=path.read_bytes();tail=data[-320:];start=length=0
 for n in range(len(tail)-19):
  if tail[n:n+3]==b'cue':start=struct.unpack_from('<I',tail,n+16)[0]
  elif tail[n:n+4]==b'adtl':length=struct.unpack_from('<I',tail,n+16)[0]
 if cue==59:endBytes,lengthBytes=0x60e8ac,0x5e0d90;start=(endBytes-lengthBytes)//4;length=lengthBytes//4
 samples,rate=sf.read(str(path),dtype='int16',always_2d=True);assert rate==44100 and samples.shape[1]==2
 end=start+length if start and length else len(samples)
 assert 0<=start<end<=len(samples),(name,start,end,len(samples))
 samples=samples[:end];target=out/(name+'.ogg')
 if not target.exists() or sf.info(str(target)).frames!=end:
  pending=target.with_suffix('.ogg.tmp')
  with sf.SoundFile(str(pending),'w',samplerate=rate,channels=2,subtype='VORBIS',format='OGG',compression_level=.4) as stream:
   for n in range(0,end,16384):stream.write(samples[n:n+16384].astype(np.float32)/32768.)
  pending.replace(target)
 info=sf.info(str(target));assert info.frames==end and info.samplerate==rate
 binary.extend(struct.pack('<iIII',cue,start,end,int(cue!=41)))
 rows.append(dict(cue=cue,file=target.name,rate=rate,frames=end,loopStart=start,loopEnd=end,looping=cue!=41,sourceSha256=hashlib.sha256(data).hexdigest(),encodedSha256=hashlib.sha256(target.read_bytes()).hexdigest(),encodedBytes=target.stat().st_size))
 print(f'{len(rows)}/34 {name}: {end} PCM frames, loop {start}..{end}',flush=True)
assert len(rows)==34
(out/'catalog.bin').write_bytes(binary)
(out/'verification.json').write_text(json.dumps(dict(codec='Vorbis',lossless=False,tracks=rows),indent=2)+'\n',encoding='utf-8')
