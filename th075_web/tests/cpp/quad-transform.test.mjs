import test from 'node:test';import assert from 'node:assert/strict';
import {core,oracle,memory,report,sha} from './helpers.mjs';
const floatBytes=x=>{const b=Buffer.alloc(4);b.writeFloatLE(x);return b;};
const floatBits=x=>floatBytes(x).readUInt32LE(0);
function returnFloat64(m,address){
  const code=m.allocate(32),out=m.allocate(8),b=Buffer.alloc(21,0x90);
  b.set([0xff,0x74,0x24,0x04,0xe8],0);b.writeInt32LE(address-(code+9),5);
  b.set([0x83,0xc4,0x04,0xdd,0x1d],9);b.writeUInt32LE(out,14);b[18]=0xc3;m.write(code,b);
  return x=>{m.call(code,{args:[floatBits(x)]});return Buffer.from(m.bytes(out,8)).readDoubleLE(0);};
}
test('original angle lookup and quad rotations are preserved',async()=>{
  const c=await core(),m=await oracle();let seed=0xcafe8539,checks=0;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  const value=range=>Math.fround(((next()%200001)-100000)*range/100000);
  try{
    m.call(0x41cae0);const tableSha=sha(m.bytes(0x6884c0,14400));
    const cos=returnFloat64(m,0x41cb40),sin=returnFloat64(m,0x41cb70),tan=returnFloat64(m,0x41cbb0);
    const boundary=[0,-0,90,-90,180,-180,270,360,720,0.09,-0.09,0.1,-0.1,89.99,90.01];
    for(let i=0;i<6000;i++){
      const a=i<boundary.length?Math.fround(boundary[i]):value(30000);
      assert.equal(c.angle_cosine(a),cos(a),'cos '+a);assert.equal(c.angle_sine(a),sin(a),'sin '+a);assert.equal(c.angle_tangent(a),tan(a),'tan '+a);checks+=3;
    }
    const original=m.allocate(132),ported=c.core_alloc(64);
    for(let i=0;i<4000;i++){
      const rect=[value(2000),value(2000),value(2000),value(2000)];
      m.call(0x427500,{ecx:original,args:rect.map(floatBits)});c.quad_rectangle(ported,...rect);
      assert.deepEqual(Buffer.from(memory(c,ported,64)),Buffer.from(m.bytes(original,64)),'rectangle '+i);checks++;
      const shift=[value(1000),value(1000),value(1000)];m.call(0x411500,{ecx:original,args:shift.map(floatBits)});c.quad_translate(ported,...shift);
      assert.deepEqual(Buffer.from(memory(c,ported,64)),Buffer.from(m.bytes(original,64)),'translation '+i);checks++;
      const scaling=[value(100),value(100),value(100),i%4===0?1:value(4),i%4===1?1:value(4),i%4===2?1:value(4)];
      m.call(0x4115c0,{ecx:original,args:scaling.map(floatBits)});c.quad_scale(ported,...scaling);
      assert.deepEqual(Buffer.from(memory(c,ported,64)),Buffer.from(m.bytes(original,64)),'scaling '+i);checks++;
      const angles=[value(100),value(100),value(100),i%4===0?0:value(720),i%4===1?0:value(720),i%4===2?0:value(720)];
      m.call(0x4116f0,{ecx:original,args:angles.map(floatBits)});c.quad_rotate(ported,...angles);
      assert.deepEqual(Buffer.from(memory(c,ported,64)),Buffer.from(m.bytes(original,64)),'rotation '+i);checks++;
    }
    c.core_free(ported);report('quad-transform-original',{checks,angleSamples:6000,quadSamples:4000,tableSha256:tableSha,originalFunctions:['0x41cae0','0x41cb40','0x41cb70','0x41cbb0','0x427500','0x411500','0x4115c0','0x4116f0'],passed:true});
  }finally{m.close();}
});
