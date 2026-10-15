import test from 'node:test';import assert from 'node:assert/strict';
import {core,oracle,memory,report} from './helpers.mjs';
test('Keyboard and joystick held-frame counts equal the original through presses, flips, simultaneous keys and overflow',async()=>{
    const c=await core(),m=await oracle(),native=m.allocate(0x60),pad=m.allocate(0xb0),keys=new Uint8Array(256),buttons=new Uint8Array(128),cpKeys=c.core_alloc(256),cpButtons=c.core_alloc(128),cpBindings=c.core_alloc(36),cpCounts=c.core_alloc(28);
    m.replace(0x404320,'original joystick state fixture',()=>pad,1);
    let seed=0xa08ec361,checks=0;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
    try{for(const controller of [-1,0,2]){
        const bindings=controller<0?[203,205,200,208,44,45,46,32,57]:[0,0,0,0,0,1,2,3,4];
        memory(c,cpBindings,36).set(new Uint8Array(new Uint32Array(bindings).buffer));c.input_reset();c.input_configure(controller,cpBindings);m.view(native,0x60).fill(0);m.view(native+4,1)[0]=controller&255;for(let i=0;i<9;i++)m.u32(native+8+i*4,bindings[i]);
        for(let frame=0;frame<1500;frame++){
            keys.fill(0);buttons.fill(0);const bits=random();for(let i=0;i<9;i++)keys[bindings[i]]=(bits&(1<<i))?0x80:0;for(let i=0;i<5;i++)buttons[i]=(bits&(1<<(i+9)))?((i&1)?1:128):0;
            const coordinates=[-1000,-501,-500,-1,0,1,500,501,1000],x=coordinates[random()%coordinates.length],y=coordinates[random()%coordinates.length];
            if(frame===10||frame===20){const counts=[frame===10?0x80000000:0x7fffffff,frame===10?0x80000000:0x7fffffff,0x7fffffff,0x7fffffff,0x7fffffff,0x7fffffff,0x7fffffff];memory(c,cpCounts,28).set(new Uint8Array(new Uint32Array(counts).buffer));c.input_set_counts(cpCounts);for(let i=0;i<7;i++)m.u32(native+0x2c+i*4,counts[i]);}
            m.write(0x671240,keys);m.i32(pad,x);m.i32(pad+4,y);m.write(pad+0x30,buttons);m.call(0x406e80,{ecx:native});
            memory(c,cpKeys,256).set(keys);memory(c,cpButtons,128).set(buttons);c.input_update(cpKeys,x,y,cpButtons);
            assert.deepEqual(Buffer.from(memory(c,c.input_counts(),28)),Buffer.from(m.bytes(native+0x2c,28)),`controller ${controller} frame ${frame}`);checks++;
        }
    }report('input-original',{passed:true,checks,controllers:['keyboard','joystick-0','joystick-2']});}finally{m.close();}
});
