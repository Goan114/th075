#include "../../cpp/multiplayer/DelaySession.hpp"
#include <cassert>
#include <cstdio>
#include <functional>

namespace {
using namespace Netplay;
struct Wire:PeerTransport {
    struct Delivery {std::uint64_t due;std::vector<std::uint8_t> bytes;};
    Wire* peer=nullptr;std::uint64_t now=0;unsigned sends=0;bool disconnected=false;
    std::deque<Delivery> input;
    bool IsOpen()const override{return !disconnected;}
    bool Failed()const override{return false;}
    bool Disconnected()const override{return disconnected;}
    bool send(const std::uint8_t* p,std::size_t n,bool reliable){
        ++sends;
        // Drop/reorder/duplicate the actual input lane, including calibration.
        if(!reliable&&sends%23==0)return true;
        const auto due=now+(reliable?4000:(sends%7)*2000);
        peer->input.push_back({due,{p,p+n}});
        if(!reliable&&sends%17==0)peer->input.push_back({due+1000,{p,p+n}});
        return true;
    }
    bool SendTo(std::uint8_t,const std::uint8_t* p,std::size_t n)override{return send(p,n,false);}
    bool SendRepairTo(std::uint8_t,const std::uint8_t* p,std::size_t n)override{return send(p,n,true);}
    bool SendControl(const std::uint8_t* p,std::size_t n)override{return send(p,n,true);}
    std::size_t BufferedAmount()const override{return 0;}
    bool Poll(std::vector<std::uint8_t>* p)override{
        for(auto i=input.begin();i!=input.end();++i)if(i->due<=now){*p=std::move(i->bytes);input.erase(i);return true;}
        return false;
    }
};
void match(std::uint32_t requested,bool corrupt=false){
    Wire wires[2];wires[0].peer=&wires[1];wires[1].peer=&wires[0];
    th075::multiplayer::DelaySession a(wires[0]),b(wires[1]);
    th075::multiplayer::DelaySession* peers[]{&a,&b};
    for(unsigned side=0;side<2;++side){SessionConfig c;c.sessionId=9001;c.seed=1947;c.gameplayAbi=0x075111;c.gameId=75;c.localPlayer=side;assert(peers[side]->Begin(c,0,requested));}
    std::uint64_t endedAt=0;bool detected=false;std::array<unsigned,2> captures{};std::array<std::vector<std::array<std::uint16_t,2>>,2> consumed;
    for(std::uint64_t now=0;now<40'000'000;now+=1000){
        wires[0].now=wires[1].now=now;
        for(unsigned side=0;side<2;++side){auto& p=*peers[side];if(!p.Pump(now)){std::printf("FAIL side=%u time=%llu frame=%u: %s\n",side,(unsigned long long)now,p.Frame(),p.Error());std::fflush(stdout);if(corrupt&&std::string(p.Error()).find("desync at frame 120")!=std::string::npos){detected=true;break;}assert(false);}
            if(now%16000||p.Frame()>=1000)continue;
            if(p.NeedsCapture()){const auto bits=std::uint16_t((p.Frame()*37+side*19)&255);assert(p.Capture(bits,now));++captures[side];}
            const auto d=p.Prepare();if(!d.canAdvance)continue;
            assert(d.predictedMask==0);consumed[side].push_back({d.inputs[0].buttons,d.inputs[1].buttons});assert(p.Verify(p.Frame()*711+1947+(corrupt&&side==1&&p.Frame()==120)));assert(p.Complete(d));
        }
        if(detected)break;
        if(a.Frame()==1000&&b.Frame()==1000){endedAt=now;break;}
    }
    if(corrupt){assert(detected);std::puts("PASS: conflicting peer state stops at explicit desync");return;}
    assert(a.Frame()==1000&&b.Frame()==1000);assert(consumed[0]==consumed[1]);assert(captures[0]==1000&&captures[1]==1000);
    assert(a.Delay()==b.Delay());if(requested!=AdonisStartup::Automatic)assert(a.Delay()==requested);
    for(unsigned frame=0;frame<1000;++frame)for(unsigned side=0;side<2;++side){
        const auto expected=frame<a.Delay()?0:((frame-a.Delay())*37+side*19)&255;
        assert(consumed[0][frame][side]==expected);
    }
    for(auto now=endedAt+1000;now<endedAt+500000;now+=1000){wires[0].now=wires[1].now=now;
        assert(a.Pump(now)&&b.Pump(now));assert(a.FlushFinish(now)&&b.FlushFinish(now));}
    assert(a.CanFinish()&&b.CanFinish());std::puts("PASS: terminal ACK repair without another physical capture");
    wires[1].disconnected=true;assert(!b.Ready());
    std::printf("PASS: D=%u, 1000 exact frames, loss/reorder/duplicates, one capture per frame\n",a.Delay());
}
}
int main(){match(0);match(2);match(9);match(Netplay::AdonisStartup::Automatic);match(2,true);return 0;}
