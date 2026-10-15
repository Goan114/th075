// Test-only capture of the original submitted vertices. No native addresses or
// graphics device calls are used by the production C++/SDL renderer.
export const bits=v=>{const b=Buffer.alloc(4);b.writeFloatLE(v);return b.readUInt32LE();};
export function originalGraphics(m,{imageSize,indexTexture}={}){
 const device=m.allocate(4),dv=m.allocate(0x140),meta=m.allocate(12),tv=m.allocate(0x44),surface=m.allocate(4),sv=m.allocate(0x24);const draws=[],state=new Map([[19,5],[20,6],[27,1],[15,1],[7,0],[14,1],[23,4]]),sampler=new Map([[16,1],[17,1]]);let bound=0;
 const method=(table,offset,name,argc,handler)=>m.u32(table+offset,m.registerImport({dll:'original graphics capture',name,argc,handler}));
 m.u32(device,dv);m.u32(0x671230,device);m.u32(surface,sv);
 const texture=(index)=>{const p=indexTexture?indexTexture(index,m.reg('ECX')):0x01800000+index*16;m.u32(p,tv);return p;};
 for(let i=0;i<2048;i++)m.u32(texture(i),tv);
 method(tv,0x3c,'surface level',3,()=>{const sp=m.reg('ESP');bound=m.u32(sp+4);m.u32(m.u32(sp+12),surface);return 0;});
 method(sv,0x20,'surface dimensions',2,()=>{const p=m.u32(m.reg('ESP')+8),i=(bound-0x01800000)/16,{width,height}=imageSize?imageSize(i):{width:256,height:256};m.view(p,32).fill(0);m.u32(p+24,2**Math.ceil(Math.log2(width)));m.u32(p+28,2**Math.ceil(Math.log2(height)));return 0;});method(sv,8,'surface release',1,()=>0);
 method(dv,0x130,'vertex layout',2,()=>0);
 method(dv,0xf4,'bind texture',3,()=>{bound=m.u32(m.reg('ESP')+12);return 0;});
 method(dv,0x120,'draw vertices',5,()=>{const sp=m.reg('ESP'),primitive=m.u32(sp+8),count=m.u32(sp+12)+2,p=m.u32(sp+16),stride=m.u32(sp+20);if(stride!==28)throw Error('vertex stride '+stride);draws.push({texture:bound?((bound-0x01800000)/16):0xffffffff,primitive,vertices:Buffer.from(m.bytes(p,count*stride)),state:Object.fromEntries(state),sampler:Object.fromEntries(sampler)});return 0;});
 method(dv,0xc8,'render state',3,()=>{const sp=m.reg('ESP');state.set(m.u32(sp+8),m.u32(sp+12));return 0;});
 method(dv,0xfc,'texture state',4,()=>{const sp=m.reg('ESP');sampler.set(m.u32(sp+12),m.u32(sp+16));return 0;});
 method(dv,0x90,'clear depth',7,()=>0);
 m.replace(0x40dd20,'unused image lookup',()=>0);
 m.replace(0x40dd60,'original image metadata',()=>{const i=m.u32(m.reg('ESP')+4),{width,height}=imageSize?imageSize(i):{width:256,height:256};m.u32(meta+4,width);m.u32(meta+8,height);return meta;},1);
 m.replace(0x40c8c0,'original image texture',()=>texture(m.u32(m.reg('ESP')+4)),1);
 m.f32(0x66c084,1);m.f32(0x671220,0);m.f32(0x671224,0);m.f32(0x66c080,1);
 return {draws,state,sampler};
}

export function originalRectangles(m){const entry=[...m.importMap.values()].find(e=>e.name==='SetRect');entry.argc=5;entry.handler=()=>{const sp=m.reg('ESP'),p=m.u32(sp+4);for(let i=0;i<4;i++)m.u32(p+i*4,m.u32(sp+8+i*4));return 1;};}
