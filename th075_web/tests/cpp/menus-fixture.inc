#include "../../cpp/game/MusicRoomScene.hpp"
#include "../../cpp/game/OptionsScene.hpp"
static MusicRoomScene musicFixture;static SelectionUnlocks musicFlags;
struct MusicSignalsFixture final:MusicRoomSignals {std::vector<i32> events;void render_music_room()override{events.push_back(1);}void present_music_room()override{events.push_back(2);}void select_music(i16 n)override{events.insert(events.end(),{3,n});}void update_title(u8 n)override{events.insert(events.end(),{4,n});}void update_details(u8 n)override{events.insert(events.end(),{5,n});}void sound(u16)override{}void fade_music(i32 a,i32 b,u32 c,u32 d)override{events.insert(events.end(),{6,a,b,i32(c),i32(d)});}};
static MusicSignalsFixture musicSignals;
API(music_catalog_load) u32 music_catalog_load(const void* p,u32 n){return musicFixture.catalog.load(p,n);}
API(music_catalog_count) u32 music_catalog_count(){return musicFixture.catalog.tracks.size();}
API(music_track_id) i32 music_track_id(u32 i){return musicFixture.catalog.tracks[i].id;}
static const std::string& music_track_field(u32 i,u32 field){const auto& t=musicFixture.catalog.tracks[i];return field==0?t.title:field==1?t.author:t.description;}
API(music_track_text) const char* music_track_text(u32 i,u32 field){return music_track_field(i,field).data();}
API(music_track_text_size) u32 music_track_text_size(u32 i,u32 field){return music_track_field(i,field).size();}
API(music_load) void music_load(const u8* p,const u8* flags,const u8* ids,u32 n){musicFixture.catalog.tracks.resize(n);for(u32 i=0;i<n;i++)musicFixture.catalog.tracks[i].id=i8(ids[i]);musicFixture.changeDelay=p[0];musicFixture.selected=p[1];musicFixture.firstVisible=p[2];std::memcpy(musicFlags.storyFlags.data(),flags,256);musicSignals.events.clear();}
API(music_apply) u32 music_apply(const i32* p){MusicRoomInput input;input.vertical={p[0],p[1]};input.confirm={p[2],p[3]};input.cancel={p[4],p[5]};input.escape=p[6]!=0;musicSignals.events.clear();return musicFixture.advance(input,musicFlags,musicSignals);}
API(music_state) const u8* music_state(){static std::array<u8,3> p;p={musicFixture.changeDelay,musicFixture.selected,musicFixture.firstVisible};return p.data();}
API(music_events) const i32* music_events(){return musicSignals.events.data();}API(music_event_count) u32 music_event_count(){return musicSignals.events.size();}
API(music_render) void music_render(){backgroundCapture.draws.clear();musicFixture.render(backgroundImages,{201,202,203,204});}
static OptionsScene optionsFixture;static GameSettings settingsFixture;static std::array<u8,32> optionsRaw;
struct OptionsSignalsFixture final:OptionsSignals {std::vector<i32> events;void sound(u16 n)override{events.insert(events.end(),{1,n});}void fade_music(i32,i32,u32,u32)override{}void render_options()override{events.push_back(2);}void present_options()override{events.push_back(3);}void description(u8 n)override{events.insert(events.end(),{4,n});}void music_volume(u8 n)override{events.insert(events.end(),{5,n});}void sound_volume(u8 n)override{events.insert(events.end(),{6,n});}void start_music(i32 n)override{events.insert(events.end(),{7,n});}void save_settings()override{events.push_back(8);settingsFixture.deviceRefresh=1;}};
static OptionsSignalsFixture optionsSignals;
API(options_load) void options_load(const u8* p,const u8* settings){std::memcpy(optionsRaw.data(),p,32);optionsFixture.selected=fixture_read<i16>(p,0x10);optionsFixture.soundWait=fixture_read<i16>(p,0x12);optionsFixture.alpha=p[0x14];optionsFixture.horizontal=i8(p[0x15]);optionsFixture.vertical=i8(p[0x16]);optionsFixture.confirm=i8(p[0x17]);optionsFixture.cancel=i8(p[0x18]);settingsFixture.load(settings,90);}
API(options_apply) u32 options_apply(){optionsSignals.events.clear();return optionsFixture.advance(settingsFixture,optionsSignals);}
API(options_poll) void options_poll(const i32* p){MenuInput input;input.horizontal={p[0],p[1]};input.vertical={p[2],p[3]};input.confirm={p[4],p[5]};input.cancel={p[6],p[7]};input.escape=p[8]!=0;optionsFixture.poll(input);}
API(options_state) const u8* options_state(){const auto put=[&](u32 at,const auto& v){std::memcpy(optionsRaw.data()+at,&v,sizeof(v));};put(0x10,optionsFixture.selected);put(0x12,optionsFixture.soundWait);put(0x14,optionsFixture.alpha);put(0x15,optionsFixture.horizontal);put(0x16,optionsFixture.vertical);put(0x17,optionsFixture.confirm);put(0x18,optionsFixture.cancel);return optionsRaw.data();}
API(options_settings) const u8* options_settings(){static std::array<u8,90> v;v=settingsFixture.save();return v.data();}
API(options_events) const i32* options_events(){return optionsSignals.events.data();}API(options_event_count) u32 options_event_count(){return optionsSignals.events.size();}
API(options_render) void options_render(){backgroundCapture.draws.clear();optionsFixture.render(backgroundImages,205,settingsFixture);}
