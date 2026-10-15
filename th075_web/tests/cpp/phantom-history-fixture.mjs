import assert from 'node:assert/strict';
// Execute the original linked-list container. Its allocator is the normal oracle heap.
export function installPhantomHistory(m,actor){
 const at=actor+0xfec;m.view(at,12).fill(0);m.call(0x531c00,{ecx:at});let header=Buffer.from(m.bytes(at,12));
 return {restore(){m.write(at,header);},preserve(){header=Buffer.from(m.bytes(at,12));},clear(){m.call(0x531ce0,{ecx:at});header=Buffer.from(m.bytes(at,12));},push(raw){const p=m.allocate(16);m.write(p,raw);m.call(0x531cb0,{ecx:at,args:[p]});header=Buffer.from(m.bytes(at,12));},entries(){const head=m.u32(at+4),count=m.u32(at+8);let node=m.u32(head);const entries=[];for(let i=0;i<count;i++){assert.notEqual(node,head);const bytes=Buffer.from(m.bytes(node+8,16));bytes[13]=0;entries.push(bytes);node=m.u32(node);}assert.equal(node,head);return entries;}};
}
