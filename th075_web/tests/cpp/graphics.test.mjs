import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';
const bits=value=>{const b=Buffer.alloc(4);b.writeFloatLE(value);return b.readUInt32LE();};
test('CPU sprite and perspective vertices equal original submitted vertex bytes',async()=>{
    const c=await core(),m=await oracle(),device=m.allocate(4),dv=m.allocate(0x130),texture=m.allocate(4),tv=m.allocate(0x44),surface=m.allocate(4),sv=m.allocate(0x24),points=m.allocate(64),rect=m.allocate(16),strip=m.allocate(28*8),cp=c.core_alloc(64),cr=c.core_alloc(16),cs=c.core_alloc(28*8);
    let width=512,height=512,captured=null,primitive=0,rng=0x1548c697,checks=0;
    const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return rng>>>0;};
    const method=(table,at,name,argc,handler)=>m.u32(table+at,m.registerImport({dll:'original graphics boundary',name,argc,handler}));
    m.u32(device,dv);m.u32(texture,tv);m.u32(surface,sv);m.u32(0x671230,device);
    method(tv,0x3c,'surface level',3,()=>{const sp=m.reg('ESP');assert.equal(m.u32(sp+4),texture);m.u32(m.u32(sp+12),surface);return 0;});
    method(sv,0x20,'surface dimensions',2,()=>{const p=m.u32(m.reg('ESP')+8);m.view(p,32).fill(0);m.u32(p+24,width);m.u32(p+28,height);return 0;});method(sv,8,'surface release',1,()=>0);
    method(dv,0xf4,'bind texture',3,()=>{assert.equal(m.u32(m.reg('ESP')+12),texture);return 0;});
    method(dv,0x120,'capture original draw',5,()=>{const sp=m.reg('ESP');primitive=m.u32(sp+8);assert.ok(primitive===5||primitive===6);const count=m.u32(sp+12)+2,p=m.u32(sp+16),stride=m.u32(sp+20);assert.equal(stride,28);captured=Buffer.from(m.bytes(p,count*stride));return 0;});
    try{for(let sample=0;sample<5000;sample++){
        width=2**(sample%10+1);height=2**((sample*7)%10+1);const scale=[0.5,1,2,0.3333,0.75][sample%5],x=((random()%8000)-4000)/32,y=((random()%8000)-4000)/32,multiplier=[1,0,0.5,0.3333,1.25,-0.25][sample%6];
        c.graphics_configure(scale,x,y,multiplier,width,height);m.f32(0x66c084,scale);m.f32(0x671220,x);m.f32(0x671224,y);m.f32(0x66c080,multiplier);
        const input=new Float32Array(Array.from({length:16},(_,i)=>i%4===2?((random()%9000)-4500)/4:((random()%32000)-8000)/16));const bounds=new Int32Array(Array.from({length:4},()=>random()%1024-128)),color=random();
        m.write(points,new Uint8Array(input.buffer));memory(c,cp,64).set(new Uint8Array(input.buffer));m.write(rect,new Uint8Array(bounds.buffer));memory(c,cr,16).set(new Uint8Array(bounds.buffer));
        captured=null;m.call(0x4029f0,{args:[points,rect,color,texture]});c.graphics_quad(cp,cr,color,77);assert.equal(c.graphics_vertex_count(),4);assert.equal(c.graphics_primitive(),4);assert.equal(primitive,5);assert.deepEqual(Buffer.from(memory(c,c.graphics_vertices(),112)),captured,`quad ${sample}`);checks++;
        const centerX=(random()%5000)/16,centerY=(random()%5000)/16,distance=[1000,3000,700,42][sample%4];captured=null;c.graphics_configure(scale,x,y,multiplier,width,height);
        m.call(0x402d50,{args:[points,rect,bits(centerX),bits(centerY),bits(distance),color,texture]});const visible=c.graphics_projected_quad(cp,cr,centerX,centerY,distance,color,77);assert.equal(visible,captured?1:0,`projected visibility ${sample}`);if(captured){assert.equal(c.graphics_primitive(),5);assert.equal(primitive,6);assert.deepEqual(Buffer.from(memory(c,c.graphics_vertices(),112)),captured,`projected ${sample}`);}checks++;
        const n=3+(sample%6),vertices=Buffer.alloc(n*28);for(let i=0;i<n;i++){for(let j=0;j<4;j++)vertices.writeFloatLE(input[(i*4+j)%16],i*28+j*4);vertices.writeUInt32LE(random(),i*28+16);vertices.writeFloatLE((random()%1024)/1024,i*28+20);vertices.writeFloatLE((random()%1024)/1024,i*28+24);}
        m.write(strip,vertices);memory(c,cs,vertices.length).set(vertices);captured=null;c.graphics_configure(scale,x,y,multiplier,width,height);m.call(0x403200,{args:[strip,n,texture]});c.graphics_projected_strip(cs,n,77);assert.deepEqual(Buffer.from(memory(c,c.graphics_vertices(),vertices.length)),captured,`strip ${sample}`);checks++;
    }report('graphics-vertices-original',{passed:true,samples:5000,draws:checks});}finally{m.close();}
});
test('Semantic blend, alpha and depth policies match original graphics state results',async()=>{
    const c=await core(),m=await oracle(),device=m.allocate(4),table=m.allocate(0x130),states=new Map([[19,2],[20,1],[27,0],[15,0],[7,0],[14,1],[23,4]]);let alphaArgument=2,clears=0,checks=0;
    m.u32(device,table);m.u32(0x671230,device);
    const method=(at,name,argc,handler)=>m.u32(table+at,m.registerImport({dll:'original graphics boundary',name,argc,handler}));
    method(0xc8,'render state capture',3,()=>{const sp=m.reg('ESP');states.set(m.u32(sp+8),m.u32(sp+12));return 0;});
    method(0xfc,'texture state capture',4,()=>{const sp=m.reg('ESP');assert.equal(m.u32(sp+8),0);assert.equal(m.u32(sp+12),5);alphaArgument=m.u32(sp+16);return 0;});
    method(0x90,'depth clear boundary',7,()=>{assert.equal(m.u32(m.reg('ESP')+16),2);clears++;return 0;});
    const blend=value=>({1:0,2:1,3:2,4:3,5:4,6:5,7:6,8:7,9:8,10:9,11:10})[value],compare=value=>({1:0,2:1,3:2,4:3,5:4,6:5,7:6,8:7})[value];
    const check=()=>{const expected=[blend(states.get(19)),blend(states.get(20)),states.get(27),states.get(15),alphaArgument===0?0:1,states.get(7),states.get(14),compare(states.get(23))];assert.deepEqual(Array.from(new Uint32Array(c.memory.buffer,c.graphics_state(),8)),expected);checks++;};
    try{for(let i=0;i<300;i++){const b=(i*7)%8,a=i%3,d=(i*5)%9;m.call(0x401f50,{args:[b]});c.graphics_blend(b);check();m.call(0x402140,{args:[a]});c.graphics_alpha(a);check();m.call(0x402250,{args:[d]});c.graphics_depth(d);check();}report('graphics-state-original',{passed:true,checks,depthClears:clears});}finally{m.close();}
});
