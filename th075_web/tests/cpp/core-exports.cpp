#include "../../cpp/game/DataArchive.hpp"
#include "../../cpp/game/InputMapping.hpp"
#include <cstdlib>
using namespace th075;
#define API(name) extern "C" __attribute__((export_name(#name)))
API(core_alloc) void* core_alloc(u32 n){return std::malloc(n);}
API(core_free) void core_free(void* p){std::free(p);}
static DataArchive archive;
API(archive_read_index) int archive_read_index(const void* p,u32 n,u32 fileBytes){return archive.read_index(p,n,fileBytes);}
API(archive_count) u32 archive_count(){return archive.entries.size();}
API(archive_name) const char* archive_name(u32 i){return i<archive.entries.size()?archive.entries[i].name.c_str():nullptr;}
API(archive_offset) u32 archive_offset(u32 i){return i<archive.entries.size()?archive.entries[i].offset:0;}
API(archive_size) u32 archive_size(u32 i){return i<archive.entries.size()?archive.entries[i].size:0;}
API(archive_error) const char* archive_error(){return archive.error.c_str();}
static InputMapping input;
API(input_reset) void input_reset(){input=InputMapping{};}
API(input_configure) void input_configure(i32 pad,const u32* bindings){input.joystick=i8(pad);std::memcpy(input.bindings.data(),bindings,36);}
API(input_update) void input_update(const u8* keyboard,i32 x,i32 y,const u8* buttons){std::array<u8,256> keys;std::memcpy(keys.data(),keyboard,256);JoystickState pad;pad.horizontal=x;pad.vertical=y;std::memcpy(pad.buttons.data(),buttons,128);input.update(keys,&pad);}
API(input_counts) const i32* input_counts(){static std::array<i32,7> values;values[0]=input.horizontal;values[1]=input.vertical;for(u32 i=0;i<5;++i)values[i+2]=input.buttons[i];return values.data();}
API(input_set_counts) void input_set_counts(const i32* values){input.horizontal=values[0];input.vertical=values[1];for(u32 i=0;i<5;++i)input.buttons[i]=values[i+2];}
#include "../../cpp/game/BitmapData.hpp"
static TexturePack textures;
API(texture_load) int texture_load(const void* p,u32 n,u32 palette){return textures.load(p,n,palette);}
API(texture_count) u32 texture_count(){return textures.images.size();}
API(texture_palette_count) u32 texture_palette_count(){return textures.paletteCount;}
API(texture_error) const char* texture_error(){return textures.error.c_str();}
API(texture_meta) const u32* texture_meta(u32 index){static std::array<u32,5> values{};if(index>=textures.images.size())return nullptr;const auto& i=textures.images[index];values={i.width,i.height,i.sourceStride,i.depth,i.packedSize};return values.data();}
API(texture_storage) const u8* texture_storage(u32 index){return index<textures.images.size()?textures.images[index].storage.data():nullptr;}
API(texture_storage_size) u32 texture_storage_size(u32 index){return index<textures.images.size()?textures.images[index].storage.size():0;}
API(texture_palette) const u16* texture_palette(u32 index){return index<textures.images.size()?textures.images[index].palette.data():nullptr;}
static std::vector<u8> decoded;
API(texture_decode) const u8* texture_decode(u32 index,u32 stride){return index<textures.images.size()&&textures.images[index].decode(decoded,stride)?decoded.data():nullptr;}
API(texture_decoded_size) u32 texture_decoded_size(){return decoded.size();}
API(texture_encode) int texture_encode(u32 index){return index<textures.images.size()&&textures.images[index].encode_runs();}
#include "../../cpp/game/FighterPattern.hpp"
static FighterPattern patterns;
API(pattern_load) int pattern_load(const void* data,u32 size){return patterns.load(data,size);}
API(pattern_import_action) int pattern_import_action(const void* data,u32 size,u32 action){FighterPattern extra;if(!extra.load(data,size)||action>=extra.sequences.size()||!extra.sequences[action].present)return 0;if(patterns.sequences.size()<=action)patterns.sequences.resize(action+1);patterns.sequences[action]=std::move(extra.sequences[action]);return 1;}
API(pattern_error) const char* pattern_error(){return patterns.error.c_str();}
API(pattern_count) u32 pattern_count(){return patterns.sequences.size();}
API(pattern_present) int pattern_present(u32 sequence){return sequence<patterns.sequences.size()&&patterns.sequences[sequence].present;}
API(pattern_header) const u16* pattern_header(u32 sequence){static std::array<u16,2> h{};if(!pattern_present(sequence))return nullptr;h={patterns.sequences[sequence].mode,patterns.sequences[sequence].next};return h.data();}
API(pattern_frames) u32 pattern_frames(u32 sequence){return pattern_present(sequence)?patterns.sequences[sequence].frames.size():0;}
static std::array<u8,120> frameBytes{};
API(pattern_frame) const u8* pattern_frame(u32 sequence,u32 index){
    if(!pattern_present(sequence)||index>=patterns.sequences[sequence].frames.size())return nullptr;
    const auto& f=patterns.sequences[sequence].frames[index];frameBytes.fill(0);
    const auto put=[&](u32 at,const auto& value){std::memcpy(frameBytes.data()+at,&value,sizeof(value));};
    put(0,f.originX);put(2,f.originY);put(4,f.duration);put(6,f.sprite);frameBytes[12]=f.basicVisual;put(16,f.baseDamage);put(20,f.proration);put(24,f.combat);put(44,f.motion);put(52,f.events);put(60,f.flags);put(68,f.baseBounds.bits);
    if(f.hasVisual){const auto& v=f.visual;frameBytes[84]=v.mode;frameBytes[85]=v.alpha;frameBytes[86]=v.red;frameBytes[87]=v.green;frameBytes[88]=v.blue;put(90,v.projection);put(96,v.scale);put(108,v.rotation);}return frameBytes.data();
}
API(pattern_visual_present) int pattern_visual_present(u32 sequence,u32 index){return pattern_present(sequence)&&index<patterns.sequences[sequence].frames.size()&&patterns.sequences[sequence].frames[index].hasVisual;}
API(pattern_rectangles) u32 pattern_rectangles(u32 sequence,u32 index,u32 attack){if(!pattern_present(sequence)||index>=patterns.sequences[sequence].frames.size())return 0;const auto& f=patterns.sequences[sequence].frames[index];return (attack?f.attackBounds:f.bodyBounds).size();}
API(pattern_rectangle_data) const Rectangle* pattern_rectangle_data(u32 sequence,u32 index,u32 attack){if(!pattern_present(sequence)||index>=patterns.sequences[sequence].frames.size())return nullptr;const auto& f=patterns.sequences[sequence].frames[index];return (attack?f.attackBounds:f.bodyBounds).data();}
#include "../../cpp/game/FighterScript.hpp"
static FighterScript story;
API(script_load) int script_load(const void* data,u32 size){return story.load(data,size);}
API(script_parse) int script_parse(const void* data,u32 size){return story.parse(data,size);}
API(script_error) const char* script_error(){return story.error.c_str();}
API(script_labels) const i16* script_labels(){return story.labels.data();}
API(script_blocks) u32 script_blocks(){return story.blocks.size();}
API(script_records) u32 script_records(u32 block){return block<story.blocks.size()?story.blocks[block].size():0;}
API(script_record_kind) u32 script_record_kind(u32 block,u32 index){return u32(story.blocks[block][index].kind);}
API(script_record_argument) i32 script_record_argument(u32 block,u32 index){return story.blocks[block][index].argument;}
API(script_record_text) const char* script_record_text(u32 block,u32 index){return story.blocks[block][index].text.c_str();}
API(script_record_text_size) u32 script_record_text_size(u32 block,u32 index){return story.blocks[block][index].text.size();}
#include "../../cpp/game/BattleGeometry.hpp"
static FighterMotion motions[2];static ReplayRandom rng;
API(motion_load) void motion_load(u32 index,const float* values,i32 facing,i32 freeze,i32 hitFreeze){auto& p=motions[index&1];p.x=values[0];p.y=values[1];p.velocityX=values[2];p.velocityY=values[3];p.accelerationX=values[4];p.accelerationY=values[5];p.pushX=values[6];p.opponentPush=values[7];p.facing=i8(facing);p.freeze=i16(freeze);p.hitFreeze=i16(hitFreeze);}
API(motion_limit) i32 motion_limit(u32 index){return motions[index&1].horizontal_limit(motions[(index&1)^1]);}
API(motion_advance) void motion_advance(u32 index){motions[index&1].advance_position(motions[(index&1)^1]);}
API(motion_values) const float* motion_values(u32 index){static std::array<float,8> values{};const auto& p=motions[index&1];values={p.x,p.y,p.velocityX,p.velocityY,p.accelerationX,p.accelerationY,p.pushX,p.opponentPush};return values.data();}
API(motion_facing) i32 motion_facing(u32 index){return motions[index&1].facing;}
API(motion_update_facing) int motion_update_facing(u32 index){return motions[index&1].update_facing(motions[(index&1)^1]);}
API(bounds_transform) const CollisionRectangle* bounds_transform(const CollisionRectangle* bounds,u32 index){static CollisionRectangle result;result=transform_bounds(*bounds,motions[index&1]);return &result;}
API(bounds_overlap) int bounds_overlap(const CollisionRectangle* a,const CollisionRectangle* b){return overlaps(*a,*b);}
API(bounds_include) const CollisionRectangle* bounds_include(const CollisionRectangle* initial,const CollisionRectangle* a,const CollisionRectangle* b){static CollisionBounds value;value.intersection=*initial;value.include_pair(*a,*b);return &value.intersection;}
API(random_seed) void random_seed(u32 state){rng.state=state;}
API(random_state) u32 random_state(){return rng.state;}
API(random_next) u32 random_next(){return rng.next();}
API(random_range) i32 random_range(i32 low,i32 high){return rng.range(low,high);}
#include "../../cpp/game/FighterCombat.hpp"
static FighterCombat combat[2];static std::array<std::array<u8,0x1000>,2> combatFixtures{};
template<class T> static T fixture_read(const u8* p,u32 at){T value;std::memcpy(&value,p+at,sizeof(value));return value;}
API(combat_load) void combat_load(u32 side,const u8* p){
    auto& s=combat[side&1];s=FighterCombat{};std::memcpy(combatFixtures[side&1].data(),p,0x1000);
    s.action=fixture_read<i16>(p,0x60);s.freeze=fixture_read<i16>(p,0x82);s.actionDelay=fixture_read<i16>(p,0x3cc);
    const u32 timerOffsets[4]={0x84,0x86,0x88,0x3bc};for(u32 i=0;i<4;i++)s.recoveryTimers[i]=fixture_read<i16>(p,timerOffsets[i]);
    s.opponentStop=fixture_read<i16>(p,0x3ba);s.opponentPush=fixture_read<float>(p,0x490);s.frameFlags=fixture_read<u32>(p,0x74);
    s.storyOpponent=p[0x2cd]!=0;s.health=fixture_read<i16>(p,0x324);s.maximumHealth=fixture_read<i16>(p,0x326);
    s.spellCharge=fixture_read<float>(p,0x368);s.spellExtent=fixture_read<float>(p,0x36c);s.spellEnded=p[0x39c];s.spellPhase=p[0x39d];
    s.spellTimer=fixture_read<i16>(p,0x3a0);s.spellValue=fixture_read<i32>(p,0x3a4);s.spellFrames=fixture_read<i32>(p,0x3a8);std::memcpy(s.spellDrain.data(),p+0x430,48);
    s.spirit=fixture_read<i16>(p,0x3b0);s.previousSpirit=fixture_read<i16>(p,0x3b2);s.spiritDelay=fixture_read<i16>(p,0x3b4);s.spiritBreak=fixture_read<i16>(p,0x3b6);
    std::memcpy(s.screenBounds.data(),p+0x2d8,16);s.noticeTimer=fixture_read<i32>(p,0x47c);s.flashTimer=i8(p[0x484]);s.fade=p[0x538];s.elapsed=fixture_read<i16>(p,0xef8);
}
API(combat_advance) int combat_advance(u32 side,i32 story,float x,float y,float span){return combat[side&1].advance(combat[(side&1)^1],story!=0,{x,y,span});}
API(combat_snapshot) const u8* combat_snapshot(u32 side){
    auto& p=combatFixtures[side&1];const auto& s=combat[side&1];const auto put=[&](u32 at,const auto& value){std::memcpy(p.data()+at,&value,sizeof(value));};
    put(0x82,s.freeze);put(0x3cc,s.actionDelay);const u32 offsets[4]={0x84,0x86,0x88,0x3bc};for(u32 i=0;i<4;i++)put(offsets[i],s.recoveryTimers[i]);put(0x490,s.opponentPush);
    put(0x324,s.health);put(0x326,s.maximumHealth);put(0x368,s.spellCharge);put(0x36c,s.spellExtent);p[0x39c]=s.spellEnded;
    put(0x3a0,s.spellTimer);put(0x3a4,s.spellValue);put(0x3a8,s.spellFrames);put(0x3b0,s.spirit);put(0x3b2,s.previousSpirit);put(0x3b4,s.spiritDelay);put(0x3b6,s.spiritBreak);
    put(0x47c,s.noticeTimer);p[0x484]=u8(s.flashTimer);p[0x538]=s.fade;put(0x2d8,s.screenBounds);put(0xef8,s.elapsed);return p.data();
}
#include "../../cpp/game/EffectPattern.hpp"
static EffectPattern effects;
API(effect_pattern_load) int effect_pattern_load(const void* source,u32 size){return effects.load(source,size);}
API(effect_pattern_count) u32 effect_pattern_count(){return effects.sequences.size();}
API(effect_pattern_present) int effect_pattern_present(u32 id){return id<effects.sequences.size()&&effects.sequences[id].present;}
API(effect_pattern_frames) u32 effect_pattern_frames(u32 id){return effect_pattern_present(id)?effects.sequences[id].frames.size():0;}
API(effect_pattern_frame) const u8* effect_pattern_frame(u32 id,u32 index){
    if(!effect_pattern_present(id)||index>=effects.sequences[id].frames.size())return nullptr;
    static std::array<u8,52> data{};data.fill(0);const auto& f=effects.sequences[id].frames[index];const auto put=[&](u32 at,const auto& v){std::memcpy(data.data()+at,&v,sizeof(v));};
    put(0,f.originX);put(2,f.originY);put(4,f.duration);put(6,f.sprite);data[12]=f.basicVisual;
    if(f.hasVisual){const auto& v=f.visual;data[16]=v.mode;data[17]=v.alpha;data[18]=v.red;data[19]=v.green;data[20]=v.blue;put(22,v.projection);put(28,v.scale);put(40,v.rotation);}return data.data();
}
API(effect_pattern_visual) int effect_pattern_visual(u32 id,u32 index){return effects.sequences[id].frames[index].hasVisual;}

#include "../../cpp/game/FighterAnimation.hpp"
static AnimationCursor animation;static u32 animationBindings=0;static std::array<i16,256> animationDurations{};
static void bind_animation(void*,AnimationCursor& a){animationBindings++;a.duration=animationDurations[u16(a.index)&255];}
API(animation_load) void animation_load(const i16* fields,const i16* durations){std::memcpy(&animation,fields,10);std::memcpy(animationDurations.data(),durations,512);animationBindings=0;}
API(animation_reset) void animation_reset(i32 action){animation.reset(i16(action),bind_animation,nullptr);}
API(animation_set) void animation_set(i32 action,i32 index,i32 elapsed){animation.set(i16(action),i16(index),i16(elapsed),bind_animation,nullptr);}
API(animation_select) void animation_select(i32 index){animation.select_frame(i16(index),bind_animation,nullptr);}
API(animation_advance) i32 animation_advance(){return animation.advance(bind_animation,nullptr);}
API(animation_values) const AnimationCursor* animation_values(){return &animation;}
API(animation_bindings) u32 animation_bindings(){return animationBindings;}
#include "../../cpp/game/ZunGraphics.hpp"
struct CaptureGraphics:GfxInterface {
    PipelineState state{};TextureSize size{};std::vector<ScreenVertex> vertices;Topology primitive=Topology::Triangles;u32 texture=0,clears=0;
    PipelineState& pipeline()override{return state;}
    TextureSize texture_size(u32)override{return size;}
    void draw(u32 t,Topology p,const ScreenVertex* v,u32 count)override{texture=t;primitive=p;vertices.assign(v,v+count);}
    void clear_depth()override{clears++;}
};
static CaptureGraphics capture;static ZunGraphics graphics(capture);
API(graphics_configure) void graphics_configure(float scale,float x,float y,float multiplier,u32 width,u32 height){graphics.drawScale=scale;graphics.originX=x;graphics.originY=y;graphics.colorMultiplier=multiplier;capture.size={width,height};capture.vertices.clear();}
API(graphics_quad) void graphics_quad(const std::array<std::array<float,4>,4>* p,const CollisionRectangle* rect,u32 color,u32 texture){graphics.textured_quad(*p,*rect,color,texture);}
API(graphics_projected_quad) int graphics_projected_quad(const std::array<std::array<float,4>,4>* p,const CollisionRectangle* rect,float x,float y,float distance,u32 color,u32 texture){return graphics.projected_quad(*p,*rect,x,y,distance,color,texture);}
API(graphics_projected_strip) void graphics_projected_strip(ScreenVertex* p,u32 count,u32 texture){graphics.projected_strip(p,count,texture);}
API(graphics_vertices) const ScreenVertex* graphics_vertices(){return capture.vertices.data();}
API(graphics_vertex_count) u32 graphics_vertex_count(){return capture.vertices.size();}
API(graphics_primitive) u32 graphics_primitive(){return u32(capture.primitive);}
API(graphics_blend) void graphics_blend(u32 mode){graphics.blend(SpriteBlend(mode));}
API(graphics_alpha) void graphics_alpha(u32 mode){graphics.alpha(SpriteAlpha(mode));}
API(graphics_depth) void graphics_depth(u32 mode){graphics.depth(DepthMode(mode));}
API(graphics_state) const u32* graphics_state(){static std::array<u32,8> data;const auto& p=capture.state;data={u32(p.sourceBlend),u32(p.destinationBlend),u32(p.blend),u32(p.alphaTest),u32(p.alpha.first.source),u32(p.depthTest),u32(p.depthWrite),u32(p.depthCompare)};return data.data();}
#include "../../cpp/game/FighterControls.hpp"
static FighterControls controls;
API(controls_reset) void controls_reset(const i32* counts,const u8* history){std::memcpy(&controls.raw,counts,24);std::memcpy(controls.history.frames.data(),history,90);controls.current={};controls.buffered={};controls.bufferTimer=0;}
API(controls_player) u32 controls_player(const ControlCounts* counts,i32 facing,i32 action){return controls.player_frame(*counts,i8(facing),i16(action));}
API(controls_replay) u32 controls_replay(u32 held,i32 facing,i32 action){return controls.replay_frame(u8(held),i8(facing),i16(action));}
API(controls_values) const i32* controls_values(){static std::array<i32,19> data{};std::memcpy(data.data(),&controls.raw,24);std::memcpy(data.data()+6,&controls.current,24);std::memcpy(data.data()+12,&controls.buffered,24);data[18]=controls.bufferTimer;return data.data();}
API(controls_history) const u8* controls_history(){return controls.history.frames.data();}
API(controls_match) u32 controls_match(const char* pattern,u32 count,u32 window,i32 facing){return controls.history.match(pattern,count,window,i8(facing));}
#include "../../cpp/game/DamageModel.hpp"
static DamageModel damageModel;static DamageTarget damageTarget;
API(damage_load) void damage_load(const float* scales,i32 pressure,i32 story,i32 phase,const i16* life,i32 hits,i32 damage){damageModel.sourcePower=scales[0];damageModel.sourceModifier=scales[1];damageModel.fighterPower=scales[2];damageModel.comboScale=scales[3];damageModel.comboHits=i16(hits);damageModel.comboDamage=i16(damage);damageTarget.snapshotHealth=i16(pressure);damageTarget.storyOpponent=story!=0;damageTarget.phase=u8(phase);std::memcpy(damageTarget.phaseMaximum.data(),life,24);}
API(damage_resolve) i32 damage_resolve(i32 base,i32 story){return damageModel.resolve(i16(base),damageTarget,story!=0);}
API(damage_scripted) void damage_scripted(i32 base,i32 proration,i32 hits,u32 defender,i32 story){damageModel.apply_scripted(i16(base),i16(proration),i16(hits),combat[defender&1],damageTarget,story!=0);}
API(damage_values) const u8* damage_values(){static std::array<u8,8> values{};std::memcpy(values.data(),&damageModel.comboHits,2);std::memcpy(values.data()+2,&damageModel.comboDamage,2);std::memcpy(values.data()+4,&damageModel.comboScale,4);return values.data();}
#include "../../cpp/game/QuadTransform.hpp"
API(angle_cosine) float angle_cosine(float a){return angle_cos(a);}
API(angle_sine) float angle_sine(float a){return angle_sin(a);}
API(angle_tangent) double angle_tangent(float a){return angle_tan(a);}
API(quad_rectangle) void quad_rectangle(QuadPoints* p,float left,float top,float right,float bottom){*p=rectangle_quad(left,top,right,bottom);}
API(quad_translate) void quad_translate(QuadPoints* p,float x,float y,float z){translate_quad(*p,x,y,z);}
API(quad_rotate) void quad_rotate(QuadPoints* p,float cx,float cy,float cz,float x,float y,float z){rotate_quad(*p,cx,cy,cz,x,y,z);}
#include "../../cpp/game/TitleScene.hpp"
struct CaptureSceneSignals:SceneSignals {
    std::vector<i32> events;
    void sound(u16 id)override{events.push_back(1);events.push_back(id);}
    void fade_music(i32 volume,i32 step,u32 interval,u32 completion)override{events.insert(events.end(),{2,volume,step,i32(interval),i32(completion)});}
};
static TitleScene title;static GameSelection selection;static CaptureSceneSignals sceneSignals;static ReplayRandom titleRandom;
API(title_initialize) void title_initialize(u32 start,u32 now,u32 menu){selection=GameSelection{};selection.titleSelection=u8(menu);title.initialize(start,now,selection);sceneSignals.events.clear();}
API(title_fixture_load) void title_fixture_load(const u8* fixture,const u8* globals,u32 seed){
    title.elapsed=fixture_read<u32>(fixture,0xc);title.startedAt=fixture_read<u32>(fixture,0x10);title.escapeHeld=fixture_read<i32>(fixture,0x1c);
    std::memcpy(title.fade.data(),fixture+0x20,4);std::memcpy(title.highlight.data(),fixture+0x24,10);std::memcpy(title.offset.data(),fixture+0x2e,10);title.selected=fixture[0x38];
    selection.mode=GameMode(globals[0]);selection.activePlayer=globals[1];selection.titleSelection=globals[2];selection.demoCycle=globals[3];selection.background=globals[4];
    std::memcpy(selection.character.data(),globals+5,2);std::memcpy(selection.firstSpell.data(),globals+7,2);std::memcpy(selection.secondSpell.data(),globals+9,2);std::memcpy(selection.alternatePalette.data(),globals+11,2);titleRandom.state=seed;
}
API(title_advance) u32 title_advance(const ControlCounts* players,u32 escape,u32 now){sceneSignals.events.clear();TitleInput input;input.players={players[0],players[1]};input.escape=escape!=0;return u32(title.advance(input,now,selection,titleRandom,sceneSignals));}
API(title_snapshot) const u8* title_snapshot(){static std::array<u8,64> fixture{};fixture.fill(0);const auto put=[&](u32 at,const auto& value){std::memcpy(fixture.data()+at,&value,sizeof(value));};put(0xc,title.elapsed);put(0x10,title.startedAt);put(0x18,title.verticalEdge);put(0x1c,title.escapeHeld);std::memcpy(fixture.data()+0x20,title.fade.data(),4);std::memcpy(fixture.data()+0x24,title.highlight.data(),10);std::memcpy(fixture.data()+0x2e,title.offset.data(),10);fixture[0x38]=title.selected;return fixture.data();}
API(title_selection) const u8* title_selection(){static std::array<u8,13> globals{};globals[0]=u8(selection.mode);globals[1]=selection.activePlayer;globals[2]=selection.titleSelection;globals[3]=selection.demoCycle;globals[4]=selection.background;std::memcpy(globals.data()+5,selection.character.data(),2);std::memcpy(globals.data()+7,selection.firstSpell.data(),2);std::memcpy(globals.data()+9,selection.secondSpell.data(),2);std::memcpy(globals.data()+11,selection.alternatePalette.data(),2);return globals.data();}
API(title_random_state) u32 title_random_state(){return titleRandom.state;}
API(title_event_count) u32 title_event_count(){return sceneSignals.events.size();}
API(title_events) const i32* title_events(){return sceneSignals.events.data();}
struct SceneDraw {u32 texture=0;std::array<ScreenVertex,4> vertices{};};
struct CaptureTitleGraphics:GfxInterface {
    PipelineState state{};std::vector<SceneDraw> draws;
    PipelineState& pipeline()override{return state;}
    TextureSize texture_size(u32 index)override{constexpr TextureSize sizes[4]={{1024,512},{256,256},{512,256},{512,32}};return sizes[index%4];}
    void draw(u32 t,Topology p,const ScreenVertex* v,u32 n)override{if(n==4&&p==Topology::Strip){SceneDraw d;d.texture=t;std::memcpy(d.vertices.data(),v,112);draws.push_back(d);}}
    void clear_depth()override{}
};
static CaptureTitleGraphics titleCapture;
API(title_render) u32 title_render(){titleCapture.draws.clear();ZunGraphics graphics(titleCapture);title.render(graphics,{0,1,2,3});return titleCapture.draws.size();}
API(title_draw) const SceneDraw* title_draw(u32 i){return i<titleCapture.draws.size()?&titleCapture.draws[i]:nullptr;}
#include "../../cpp/game/FighterMovement.hpp"
static FighterMovement movement;static FighterAnimation movementAnimation;static FighterMotion movementActor,movementOpponent;static ControlCounts movementInput;static ReplayRandom movementRandom;
static std::array<u8,0x1000> movementFixture{};
API(movement_load) void movement_load(const u8* p,u32 randomState){
    std::memcpy(movementFixture.data(),p,0x1000);movement={};movement.usedAirDashes=p[0x3ad];movement.usedAirJumps=p[0x3ae];movement.recoveryDelay=fixture_read<i16>(p,0x3c8);
    movementActor={};movementActor.x=fixture_read<float>(p,0x44);movementActor.y=fixture_read<float>(p,0x48);movementActor.facing=i8(p[0x66]);movementOpponent={};movementOpponent.x=fixture_read<float>(p,0x2e8);
    movementAnimation={};movementAnimation.cursor.action=fixture_read<i16>(p,0x60);movementAnimation.cursor.index=fixture_read<i16>(p,0x62);movementAnimation.cursor.elapsed=fixture_read<i16>(p,0x64);
    movementInput.horizontal=fixture_read<i32>(p,0x4dc);movementInput.vertical=fixture_read<i32>(p,0x4e0);std::memcpy(movementInput.buttons.data(),p+0x4e8,16);movementRandom.state=randomState;
}
API(movement_select) void movement_select(){movement.select(movementActor,movementOpponent,movementInput,movementAnimation);}
API(movement_recover) void movement_recover(u32 frameFlags,i32 training){movement.aerial_recovery(movementActor.y,movementActor.facing,fixture_read<i16>(movementFixture.data(),0x324),frameFlags,movementInput,movementFixture[0x2cd]!=0,training!=0,movementFixture[0x52e]!=0,movementRandom,movementAnimation);}
API(movement_snapshot) const u8* movement_snapshot(){const auto put=[&](u32 at,const auto& v){std::memcpy(movementFixture.data()+at,&v,sizeof(v));};put(0x60,movementAnimation.cursor.action);put(0x62,movementAnimation.cursor.index);put(0x64,movementAnimation.cursor.elapsed);movementFixture[0x66]=u8(movementActor.facing);movementFixture[0x3ad]=movement.usedAirDashes;movementFixture[0x3ae]=movement.usedAirJumps;put(0x3c8,movement.recoveryDelay);return movementFixture.data();}
API(movement_random_state) u32 movement_random_state(){return movementRandom.state;}
#include "../../cpp/game/ReplayFile.hpp"
static ReplayFile replayFile;static std::vector<u8> replayBytes;
API(replay_new) void replay_new(const u8* header){replayFile=ReplayFile{};std::memcpy(replayFile.header.data(),header,60);replayBytes.clear();}
API(replay_append) void replay_append(const u8* metadata,const u8* inputs,u32 inputCount,const i16* random,u32 randomCount,const u8* auxiliary,u32 auxiliaryCount,const u32* events,u32 eventCount){ReplayRound round;std::memcpy(round.opponentOptions.data(),metadata,6);round.stage=metadata[6];round.initialHealth=fixture_read<i16>(metadata,7);round.initialLives=metadata[9];round.initialScore=fixture_read<u32>(metadata,10);round.playerInputs.assign(inputs,inputs+inputCount);round.randomValues.assign(random,random+randomCount);round.auxiliaryInputs.assign(auxiliary,auxiliary+auxiliaryCount);round.events.assign(events,events+eventCount);replayFile.rounds.push_back(std::move(round));}
API(replay_encode) int replay_encode(){return replayFile.encode(replayBytes);}
API(replay_data) const u8* replay_data(){return replayBytes.data();}
API(replay_size) u32 replay_size(){return replayBytes.size();}
API(replay_load) int replay_load(const void* p,u32 n){return replayFile.load(p,n);}
API(replay_error) const char* replay_error(){return replayFile.error.c_str();}
API(replay_round_count) u32 replay_round_count(){return replayFile.rounds.size();}
API(replay_queue_count) u32 replay_queue_count(u32 index,u32 type){const auto& r=replayFile.rounds[index];return type==0?r.playerInputs.size():type==1?r.randomValues.size():type==2?r.auxiliaryInputs.size():r.events.size();}
API(replay_queue_data) const void* replay_queue_data(u32 index,u32 type){const auto& r=replayFile.rounds[index];return type==0?static_cast<const void*>(r.playerInputs.data()):type==1?static_cast<const void*>(r.randomValues.data()):type==2?static_cast<const void*>(r.auxiliaryInputs.data()):static_cast<const void*>(r.events.data());}
static ReplayStreams replayStreams;
API(replay_stream_bind) void replay_stream_bind(u32 mode,u32 round,u32 seed){replayStreams.bind(ReplayMode(mode),round<replayFile.rounds.size()?&replayFile.rounds[round]:nullptr,seed);}
API(replay_stream_range) i32 replay_stream_range(i32 low,i32 high){return replayStreams.range(low,high);}
API(replay_stream_state) u32 replay_stream_state(){return replayStreams.random.state;}
#include "../../cpp/game/GuardSelector.hpp"
static FighterMotion guardMotion,guardOpponent;static FighterCombat guardCombat;static ControlCounts guardInput;static std::array<u8,0x1000> guardFixture;static ReplayRound guardRound;static ReplayStreams guardStreams;
API(guard_load) void guard_load(const u8* p,u32 flags,u32 mode,u32 seed,u32 playbackByte){
    std::memcpy(guardFixture.data(),p,0x1000);guardMotion={};guardOpponent={};guardCombat={};guardInput={};guardRound={};guardMotion.x=fixture_read<float>(p,0x44);guardMotion.y=fixture_read<float>(p,0x48);guardOpponent.x=fixture_read<float>(p,0x2e8);guardCombat.action=fixture_read<i16>(p,0x60);guardCombat.recoveryTimers[3]=fixture_read<i16>(p,0x3bc);guardCombat.spirit=fixture_read<i16>(p,0x3b0);guardInput.horizontal=fixture_read<i32>(p,0x4dc);guardInput.vertical=fixture_read<i32>(p,0x4e0);guardCombat.frameFlags=flags;guardRound.auxiliaryInputs.push_back(u8(playbackByte));guardStreams.bind(ReplayMode(mode),&guardRound,seed);
}
API(guard_select) u32 guard_select(u32 attack,u32 training,u32 difficulty){DefenseView view{guardMotion,guardOpponent,guardCombat,guardInput};view.collisionFlags=guardCombat.frameFlags;view.cpuControlled=guardFixture[0x2cd]!=0;view.guardEstablished=guardFixture[0x465]!=0;view.training=training!=0;view.trainingGuard=guardFixture[0x52f];view.difficulty=u8(difficulty);return u32(select_guard_response(view,attack,guardStreams));}
API(guard_counts) const i32* guard_counts(){static std::array<i32,2> counts;counts={guardInput.horizontal,guardInput.vertical};return counts.data();}
API(guard_random_state) u32 guard_random_state(){return guardStreams.random.state;}
API(guard_record_count) u32 guard_record_count(){return guardStreams.mode==ReplayMode::Recording?guardRound.auxiliaryInputs.size()-1:0;}
API(guard_record_value) u32 guard_record_value(){return guardRound.auxiliaryInputs.back();}

#include "../../cpp/game/CollisionResponse.hpp"
struct ImpactFixtureState {
    FighterMotion motion;FighterCombat combat;FighterAnimation animation;FighterMovement movement;DamageModel damage;DamageTarget target;
    i32 response=0,score=0;u8 side=0;i16 hits=0;bool active=false;float impulseX=0,impulseY=0,bodyPower=1,modifier=1;bool preventDamage=false,allowPush=false;u32 flags=0;std::array<u8,0x1000> bytes{};
};
static BattleRecords impactRecords;static std::array<ImpactFixtureState,3> impactStates;static PatternFrame impactPattern;
struct CaptureCollisionSignals:CollisionSignals {
    std::vector<i32> values;
    void sound(i32 id)override{values.insert(values.end(),{1,id});}
    void effect(i16 id,i8 face)override{values.insert(values.end(),{2,id,face});}
    void combo(i16 hits,i16 damage,i32 units)override{values.insert(values.end(),{3,hits,damage,units});}
};
static CaptureCollisionSignals collisionSignals;
static FighterImpact impact_view(u32 index){auto& s=impactStates[index];const auto& opponent=impactStates[index==2?1:2];FighterImpact view{s.motion,opponent.motion,s.combat,s.animation,s.movement,s.damage,s.target,s.response,s.active,s.allowPush,s.impulseX,s.impulseY,s.score,impactRecords};view.playerSide=s.side;view.bodyPower=s.bodyPower;view.preventDamage=s.preventDamage;view.collisionFlags=s.flags;return view;}
API(impact_load) void impact_load(u32 side,const u8* p,u32 flags){
    auto& s=impactStates[side%3];s={};std::memcpy(s.bytes.data(),p,0x1000);s.motion.x=fixture_read<float>(p,0x44);s.motion.y=fixture_read<float>(p,0x48);s.motion.facing=i8(p[0x66]);s.combat.action=fixture_read<i16>(p,0x60);s.animation.cursor.action=s.combat.action;s.animation.cursor.index=fixture_read<i16>(p,0x62);s.animation.cursor.elapsed=fixture_read<i16>(p,0x64);s.response=fixture_read<i32>(p,0x7c);s.hits=fixture_read<i16>(p,0x80);s.combat.freeze=fixture_read<i16>(p,0x82);s.combat.recoveryTimers[0]=fixture_read<i16>(p,0x84);s.combat.recoveryTimers[1]=fixture_read<i16>(p,0x86);s.combat.recoveryTimers[2]=fixture_read<i16>(p,0x88);s.combat.recoveryTimers[3]=fixture_read<i16>(p,0x3bc);s.impulseX=fixture_read<float>(p,0x94);s.impulseY=fixture_read<float>(p,0x98);s.bodyPower=fixture_read<float>(p,0x9c);s.modifier=fixture_read<float>(p,0xa4);s.damage.fighterPower=fixture_read<float>(p,0xa0);s.damage.comboScale=fixture_read<float>(p,0x3c0);s.damage.comboHits=fixture_read<i16>(p,0x3c4);s.damage.comboDamage=fixture_read<i16>(p,0x3c6);s.combat.health=fixture_read<i16>(p,0x324);s.combat.maximumHealth=fixture_read<i16>(p,0x326);s.target.snapshotHealth=fixture_read<i16>(p,0x328);s.target.storyOpponent=p[0x2cd]!=0;s.target.phase=p[0x39d];std::memcpy(s.target.phaseMaximum.data(),p+0x33e,24);s.combat.spellCharge=fixture_read<float>(p,0x368);s.combat.spellExtent=fixture_read<float>(p,0x36c);s.combat.spellTimer=fixture_read<i16>(p,0x3a0);s.combat.spellEnded=p[0x39c];s.combat.spirit=fixture_read<i16>(p,0x3b0);s.combat.spiritBreak=fixture_read<i16>(p,0x3b6);s.score=fixture_read<i32>(p,0x2d0);s.side=p[0x2cc];s.combat.actionDelay=fixture_read<i16>(p,0x3cc);s.combat.armorHits=fixture_read<i16>(p,0x3ca);s.combat.flashTimer=i8(p[0x484]);s.preventDamage=p[0x3ce]!=0;s.allowPush=p[0x3be]!=0;s.movement.recoveryDelay=fixture_read<i16>(p,0x3c8);s.active=p[0x40]!=0;s.flags=flags;
}
API(impact_pattern) void impact_pattern(const u8* p){impactPattern={};impactPattern.baseDamage=fixture_read<i16>(p,0x10);impactPattern.proration=fixture_read<float>(p,0x14);std::memcpy(impactPattern.combat.data(),p+0x18,20);std::memcpy(impactPattern.motion.data(),p+0x2c,8);std::memcpy(impactPattern.events.data(),p+0x34,6);std::memcpy(impactPattern.flags.data(),p+0x3c,8);}
API(impact_apply) u32 impact_apply(u32 operation,u32 guard,u32 story,u32 activeRound,i32 action){
    collisionSignals.values.clear();auto owner=impact_view(1),target=impact_view(2);auto& a=impactStates[0];AttackImpact attack{impactPattern,a.response,a.hits,a.combat.freeze,a.motion.facing,a.bodyPower,a.modifier};
    switch(operation){case 0:return cancel_special_contact(attack,target);case 1:return graze_contact(attack,target,collisionSignals);case 2:apply_guard_impact(attack,owner,target,collisionSignals);return 1;case 3:return reflect_contact(attack,owner,target,collisionSignals);case 4:break_guard(target,i16(action),collisionSignals);return 1;case 5:apply_chip_hit(attack,owner,target,story!=0,collisionSignals);return 1;case 6:return apply_ground_hit(attack,owner,target,story!=0,activeRound!=0,collisionSignals);case 7:return apply_guard_response(GuardResponse(guard),attack,owner,target,story!=0,collisionSignals);case 8:apply_normal_hit(attack,owner,target,story!=0,activeRound!=0,collisionSignals);return 1;case 9:return apply_armor_hit(attack,owner,target,story!=0,activeRound!=0,collisionSignals);case 10:apply_counter_reaction(attack,target,collisionSignals);return 1;}return 0;
}
API(impact_snapshot) const u8* impact_snapshot(u32 side){auto& s=impactStates[side%3];const auto put=[&](u32 at,const auto& v){std::memcpy(s.bytes.data()+at,&v,sizeof(v));};s.bytes[0x40]=s.active;s.bytes[0x3be]=s.allowPush;put(0x60,s.animation.cursor.action);put(0x62,s.animation.cursor.index);put(0x64,s.animation.cursor.elapsed);s.bytes[0x66]=u8(s.motion.facing);put(0x7c,s.response);put(0x80,s.hits);put(0x82,s.combat.freeze);put(0x94,s.impulseX);put(0x98,s.impulseY);put(0x324,s.combat.health);put(0x326,s.combat.maximumHealth);put(0x368,s.combat.spellCharge);put(0x36c,s.combat.spellExtent);put(0x3b0,s.combat.spirit);put(0x3b6,s.combat.spiritBreak);put(0x3c0,s.damage.comboScale);put(0x3c4,s.damage.comboHits);put(0x3c6,s.damage.comboDamage);put(0x3c8,s.movement.recoveryDelay);put(0x3ca,s.combat.armorHits);put(0x3cc,s.combat.actionDelay);put(0x2d0,s.score);s.bytes[0x484]=u8(s.combat.flashTimer);return s.bytes.data();}
API(impact_event_count) u32 impact_event_count(){return collisionSignals.values.size();}
API(impact_events) const i32* impact_events(){return collisionSignals.values.data();}

API(impact_records_load) void impact_records_load(const i32* p){impactRecords.maximumDamage=p[0];impactRecords.maximumHits=p[1];impactRecords.sessionCombo=i16(p[2]);impactRecords.highScore=u32(p[3]);}
API(impact_records_values) const u32* impact_records_values(){static std::array<u32,4> values;values={u32(impactRecords.maximumDamage),u32(impactRecords.maximumHits),u32(i32(impactRecords.sessionCombo)),impactRecords.highScore};return values.data();}
#include "../../cpp/game/BodySeparation.hpp"
static BodySeparation bodySeparation;
API(body_separation_reset) void body_separation_reset(i32 left,i32 right){bodySeparation.leftOccupant=i8(left);bodySeparation.rightOccupant=i8(right);}
API(body_separation_advance) u32 body_separation_advance(const CollisionRectangle* bounds){return bodySeparation.advance(motions[0],bounds[0],motions[1],bounds[1]);}
API(body_separation_occupants) i32 body_separation_occupants(){return u8(bodySeparation.leftOccupant)|(u32(u8(bodySeparation.rightOccupant))<<8);}
#include "../../cpp/game/CollisionPipeline.hpp"
static PatternFrame targetCollisionPattern;static CollisionBounds pipelineBounds;static ControlCounts pipelineControls;static ReplayStreams pipelineReplay;
API(impact_collision_frames) void impact_collision_frames(u32 a,u32 ai,u32 b,u32 bi){const auto& f=patterns.sequences[a].frames[ai];impactPattern.baseBounds=f.baseBounds;impactPattern.attackBounds=f.attackBounds;targetCollisionPattern=patterns.sequences[b].frames[bi];}
API(impact_pipeline_bounds_load) void impact_pipeline_bounds_load(const CollisionRectangle* bounds){pipelineBounds.intersection=*bounds;}
API(impact_pipeline_bounds) const CollisionRectangle* impact_pipeline_bounds(){return &pipelineBounds.intersection;}
API(impact_pipeline_apply) u32 impact_pipeline_apply(u32 snap,u32 liveFlags,u32 difficulty,u32 story,u32 activeRound){
    collisionSignals.values.clear();auto owner=impact_view(1),target=impact_view(2);auto& a=impactStates[0];targetCollisionPattern.flags[0]=target.collisionFlags;
    const auto& raw=impactStates[2].bytes;pipelineControls.horizontal=fixture_read<i32>(raw.data(),0x4dc);pipelineControls.vertical=fixture_read<i32>(raw.data(),0x4e0);
    DefenseView defense{target.motion,target.opponent,target.combat,pipelineControls};defense.cpuControlled=raw[0x2cd]!=0;defense.guardEstablished=raw[0x465]!=0;defense.difficulty=difficulty;defense.training=false;
    AttackImpact attack{impactPattern,a.response,a.hits,a.combat.freeze,a.motion.facing,a.bodyPower,a.modifier};pipelineReplay.bind(ReplayMode::Live,nullptr,1);
    const auto result=resolve_fighter_contact(pipelineBounds,attack,{a.motion,i32(snap)},owner,target,{targetCollisionPattern,liveFlags},defense,pipelineReplay,story!=0,activeRound!=0,collisionSignals);
    std::memcpy(impactStates[2].bytes.data()+0x4dc,&pipelineControls.horizontal,4);std::memcpy(impactStates[2].bytes.data()+0x4e0,&pipelineControls.vertical,4);return result;
}
static std::array<PatternSequence,2> clashSequences,clashSnapshotSequences;static std::array<PatternFrame,2> clashFrames;
static std::array<std::array<u8,16>,2> clashStorage;
API(clash_load) void clash_load(u32 side,u32 action,u32 index,const u32* values){clashFrames[side]=patterns.sequences[action].frames[index];clashSequences[side].mode=u16(values[0]);clashSequences[side].next=u16(values[1]);clashSnapshotSequences[side].mode=u16(values[2]);impactStates[side].response=i32(values[3]);impactStates[side].hits=i16(values[4]);impactStates[side].impulseX=fixture_read<float>(reinterpret_cast<const u8*>(values),24);impactStates[side].impulseY=fixture_read<float>(reinterpret_cast<const u8*>(values),28);impactStates[side].flags=values[5];}
API(clash_apply) u32 clash_apply(){
    auto view=[](u32 side){auto& s=impactStates[side];return ProjectileCollisionView{clashFrames[side],clashSequences[side],clashSnapshotSequences[side],s.motion,i32(s.flags),s.response,s.hits,s.impulseX,s.impulseY};};auto a=view(0),b=view(1);return resolve_projectile_contact(pipelineBounds,a,b);
}
API(clash_values) const u8* clash_values(u32 side){auto& s=impactStates[side];auto& b=clashStorage[side];std::memcpy(b.data(),&s.response,4);std::memcpy(b.data()+4,&s.hits,2);std::memcpy(b.data()+8,&s.impulseX,4);std::memcpy(b.data()+12,&s.impulseY,4);return b.data();}
#include "../../cpp/game/RoundRules.hpp"
static RoundRules roundRules;static std::array<RoundFighterState,2> roundFighters;static std::array<std::array<u8,0x1000>,2> roundFighterBytes;static std::array<u8,0x180> roundSceneBytes;
API(round_fighter_load) void round_fighter_load(u32 side,const u8* p){auto& f=roundFighters[side];f={};std::memcpy(roundFighterBytes[side].data(),p,0x1000);f.score=fixture_read<i32>(p,0x2d0);f.motion.x=fixture_read<float>(p,0x44);f.motion.y=fixture_read<float>(p,0x48);f.combat.action=fixture_read<i16>(p,0x60);f.confirmCount=fixture_read<i32>(p,0x4e4);f.selectedSpell=p[0x366];f.storyPhaseCount=p[0x39e];f.trainingSpell=p[0x52d];f.dialogueFinished=p[0x6ef]!=0;f.noticePortrait=i8(p[0x6e7]);std::memcpy(f.rawInputs.data(),p+0x4c0,28);std::memcpy(f.phaseBonuses.data(),p+0x400,48);for(u32 i=0;i<p[0x53a]&&i<2;i++){const auto* text=p+0x53b+i*200;u32 length=0;while(length<200&&text[length])++length;f.victoryLines.emplace_back(reinterpret_cast<const char*>(text),length);f.victoryPortraits.push_back(i8(p[0x6cb+i]));}f.combat.health=fixture_read<i16>(p,0x324);f.combat.maximumHealth=fixture_read<i16>(p,0x326);std::memcpy(f.phaseKinds.data(),p+0x32a,13);std::memcpy(f.phaseMaximum.data(),p+0x33e,24);std::memcpy(f.cardIds.data(),p+0x384,12);f.combat.spellCharge=fixture_read<float>(p,0x368);f.combat.spellExtent=fixture_read<float>(p,0x36c);f.combat.spellEnded=p[0x39c];f.combat.spellPhase=p[0x39d];f.combat.spellTimer=fixture_read<i16>(p,0x3a0);roundRules.spellElapsed[side]=fixture_read<i16>(p,0x3a2);f.combat.spellValue=fixture_read<i32>(p,0x3a4);f.combat.spellFrames=fixture_read<i32>(p,0x3a8);f.combat.spirit=fixture_read<i16>(p,0x3b0);f.combat.spiritBreak=fixture_read<i16>(p,0x3b6);f.damageDisabled=p[0x3ce]!=0;f.transitionReady=p[0x3cf]!=0;f.perfectSpell=p[0x464]!=0;}
API(round_state_load) void round_state_load(const u8* p,u32 highScore,i32 awarded,i32 lives){std::memcpy(roundSceneBytes.data(),p,0x180);roundRules.phase=BattlePhase(p[0x18]);roundRules.countdown=fixture_read<i32>(p,0xc);roundRules.freezeFrames=fixture_read<i16>(p,0x1a);roundRules.winner=p[0x5d];roundRules.sceneFade=fixture_read<float>(p,0x9c);roundRules.bonusValue=fixture_read<i32>(p,0x68);roundRules.bonusTimer=fixture_read<i32>(p,0x6c);roundRules.highScore=highScore;roundRules.awardedSpellTime=awarded;roundRules.remainingLives=i8(lives);for(u32 side=0;side<2;side++){auto& v=roundRules.spellPresentation[side];v.portraitAlpha=p[0xdc+side];v.ringAlpha=p[0xde + side];v.textAlpha=p[0xe0+side];v.scale=fixture_read<float>(p,0xe4+side*4);v.initialTime=fixture_read<i32>(p,0xec+side*4);v.angle=fixture_read<float>(p,0xf4+side*4);v.velocity=fixture_read<float>(p,0xfc+side*4);v.spread=fixture_read<float>(p,0x104+side*4);}}
API(round_card_load) void round_card_load(u32 index,i32 score,i32 captures,i32 perfect){roundRules.storyCards[index]={score,i16(captures),perfect!=0};}
API(round_apply) void round_apply(u32 operation,u32 mode,u32 replayMode){if(operation==0)roundRules.detect_knockout(roundFighters[0],roundFighters[1],GameMode(mode),u8(replayMode));else roundRules.advance_spell_presentation(roundFighters[0],roundFighters[1]);}
API(round_scene_snapshot) const u8* round_scene_snapshot(){auto& b=roundSceneBytes;const auto put=[&](u32 at,const auto& v){std::memcpy(b.data()+at,&v,sizeof(v));};b[0x18]=u8(roundRules.phase);put(0xc,roundRules.countdown);put(0x1a,roundRules.freezeFrames);b[0x5d]=roundRules.winner;put(0x9c,roundRules.sceneFade);put(0x68,roundRules.bonusValue);put(0x6c,roundRules.bonusTimer);for(u32 side=0;side<2;side++){const auto& v=roundRules.spellPresentation[side];b[0xdc+side]=v.portraitAlpha;b[0xde + side]=v.ringAlpha;b[0xe0+side]=v.textAlpha;put(0xe4+side*4,v.scale);put(0xec+side*4,v.initialTime);put(0xf4+side*4,v.angle);put(0xfc+side*4,v.velocity);put(0x104+side*4,v.spread);}return b.data();}
API(round_fighter_snapshot) const u8* round_fighter_snapshot(u32 side){auto& b=roundFighterBytes[side];const auto& f=roundFighters[side];const auto put=[&](u32 at,const auto& v){std::memcpy(b.data()+at,&v,sizeof(v));};put(0x44,f.motion.x);put(0x48,f.motion.y);put(0x2d0,f.score);b[0x366]=f.selectedSpell;b[0x6ef]=f.dialogueFinished;b[0x6e7]=u8(f.noticePortrait);put(0x324,f.combat.health);put(0x326,f.combat.maximumHealth);put(0x368,f.combat.spellCharge);put(0x36c,f.combat.spellExtent);b[0x39c]=f.combat.spellEnded;b[0x39d]=f.combat.spellPhase;put(0x3a0,f.combat.spellTimer);put(0x3a2,roundRules.spellElapsed[side]);put(0x3a4,f.combat.spellValue);put(0x3a8,f.combat.spellFrames);put(0x3b0,f.combat.spirit);put(0x3b6,f.combat.spiritBreak);b[0x3ce]=f.damageDisabled;b[0x3cf]=f.transitionReady;b[0x464]=f.perfectSpell;return b.data();}
API(round_globals) const u32* round_globals(){static std::array<u32,3> v;v={roundRules.highScore,u32(roundRules.awardedSpellTime),u32(i32(roundRules.remainingLives))};return v.data();}
API(round_cards) const StoryCardRecord* round_cards(){return roundRules.storyCards.data();}
#include "../../cpp/game/BattleProgress.hpp"
static BattleProgress battleProgress(roundRules);static BattleSession battleSession;
static i32 text_checksum(const std::string& text){u32 value=2166136261u;for(u8 byte:text)value=(value^byte)*16777619u;i32 result;std::memcpy(&result,&value,4);return result;}
struct CaptureBattleFlow:BattleFlowSignals {
    std::vector<i32> values;
    void begin_round_recording()override{values.push_back(1);}void banner(bool knockout)override{values.insert(values.end(),{2,knockout?1:0});}
    void fade_music(i32 target,i32 step,u32 interval,u32 completion)override{values.insert(values.end(),{3,target,step,i32(interval),i32(completion)});}
    void stop_music(i32 step)override{values.insert(values.end(),{4,step});}void finish_replay_round()override{values.push_back(5);}
    void dialogue_origin(float x,float y,u32 layout)override{values.insert(values.end(),{6,i32(x),i32(y),i32(layout)});}
    void prepare_victory(RoundFighterState& f)override{values.insert(values.end(),{7,&f==&roundFighters[0]?0:1});}
    void show_victory_line(const std::string& text,u8 alpha)override{values.insert(values.end(),{8,text_checksum(text),alpha});}
    void end_story_dialogue()override{values.push_back(9);}void render_before_story_load()override{values.push_back(10);}
    void release_battle_loader()override{values.push_back(11);}void stage_story_completed()override{values.push_back(12);}
    void reset_fighter(u32 side,RoundFighterState&)override{values.insert(values.end(),{14,i32(side)});}
    void reset_stage_effects()override{values.push_back(15);}void advance_overlay()override{values.push_back(16);}
};
static CaptureBattleFlow battleFlowSignals;
API(flow_load) void flow_load(const u8* p,const u32* values){battleProgress.victorySlide=fixture_read<float>(p,0x8c);battleProgress.textSlide=fixture_read<float>(p,0x90);battleProgress.dialogueProgress=i8(p[0x5c]);battleProgress.victoryLine=i8(p[0x5e]);battleProgress.paused=p[0xa0]!=0;battleProgress.pauseFade=p[0xa1];battleProgress.pauseChoice=i8(p[0x118]);battleProgress.trainingInstantRecovery=p[0x1c]!=0;battleProgress.overlayTime=fixture_read<i32>(p,0x60);battleProgress.demoFrames=fixture_read<i32>(p,0x10c);std::memcpy(battleProgress.healthFade.data(),p+0x98,2);std::memcpy(battleProgress.savedInputs.data(),p+0xa4,56);battleSession={};battleSession.mode=GameMode(values[0]);battleSession.replayMode=u8(values[1]);battleSession.characters={u8(values[2]),u8(values[3])};battleSession.roundIndex=i8(values[4]);battleSession.totalRounds=i8(values[5]);battleSession.replayRound=i8(values[6]);battleSession.continueCredits=i8(values[7]);battleSession.replayDisposition=i8(values[8]);battleSession.playbackDialogue=values[9]!=0;battleSession.replayExhausted=values[10]!=0;battleSession.restartFade=u8(values[11]);battleSession.overlayPulse=fixture_read<float>(reinterpret_cast<const u8*>(values),48);battleSession.storyOverlay=fixture_read<float>(reinterpret_cast<const u8*>(values),52);battleSession.scoreToBeat=values[14];battleSession.maximumStoryBonus=i32(values[15]);}
API(flow_apply) u32 flow_apply(){battleFlowSignals.values.clear();return u32(battleProgress.advance(roundFighters[0],roundFighters[1],battleSession,battleFlowSignals));}
API(flow_scene_snapshot) const u8* flow_scene_snapshot(){round_scene_snapshot();const auto put=[](u32 at,const auto& v){std::memcpy(roundSceneBytes.data()+at,&v,sizeof(v));};put(0x8c,battleProgress.victorySlide);put(0x90,battleProgress.textSlide);roundSceneBytes[0x5c]=u8(battleProgress.dialogueProgress);roundSceneBytes[0x5e]=u8(battleProgress.victoryLine);roundSceneBytes[0xa0]=battleProgress.paused;roundSceneBytes[0xa1]=battleProgress.pauseFade;roundSceneBytes[0x118]=battleProgress.pauseChoice;put(0x10c,battleProgress.demoFrames);put(0x98,battleProgress.healthFade);put(0xa4,battleProgress.savedInputs);return roundSceneBytes.data();}
API(flow_session_values) const u32* flow_session_values(){static std::array<u32,16> values;values={u32(battleSession.mode),battleSession.replayMode,battleSession.characters[0],battleSession.characters[1],u32(i32(battleSession.roundIndex)),u32(i32(battleSession.totalRounds)),u32(i32(battleSession.replayRound)),u32(i32(battleSession.continueCredits)),u32(i32(battleSession.replayDisposition)),u32(battleSession.playbackDialogue),u32(battleSession.replayExhausted),battleSession.restartFade,0,0,battleSession.scoreToBeat,u32(battleSession.maximumStoryBonus)};std::memcpy(values.data()+12,&battleSession.overlayPulse,4);std::memcpy(values.data()+13,&battleSession.storyOverlay,4);return values.data();}
API(flow_victories) const i32* flow_victories(){return battleSession.victories[0].data();}
API(flow_events) const i32* flow_events(){return battleFlowSignals.values.data();}
API(flow_event_count) u32 flow_event_count(){return battleFlowSignals.values.size();}
#include "../../cpp/game/CameraMotion.hpp"
static CameraMotion cameraMotion;
API(camera_load) void camera_load(const float* p,u32 fixed){cameraMotion.fixedY=p[0];cameraMotion.targetSpan=p[1];cameraMotion.y=p[2];cameraMotion.shakeY=p[3];cameraMotion.span=p[4];cameraMotion.shakeX=p[5];cameraMotion.smoothX=p[6];cameraMotion.fixedX=p[7];cameraMotion.biasX=p[8];cameraMotion.targetX=p[9];cameraMotion.fixedSpan=p[10];cameraMotion.amplitude=p[11];cameraMotion.angleY=p[12];cameraMotion.targetY=p[13];cameraMotion.x=p[14];cameraMotion.smoothY=p[15];cameraMotion.biasY=p[16];cameraMotion.angleX=p[17];cameraMotion.fixed=fixed!=0;}
API(camera_values) const float* camera_values(){static std::array<float,18> p;p={cameraMotion.fixedY,cameraMotion.targetSpan,cameraMotion.y,cameraMotion.shakeY,cameraMotion.span,cameraMotion.shakeX,cameraMotion.smoothX,cameraMotion.fixedX,cameraMotion.biasX,cameraMotion.targetX,cameraMotion.fixedSpan,cameraMotion.amplitude,cameraMotion.angleY,cameraMotion.targetY,cameraMotion.x,cameraMotion.smoothY,cameraMotion.biasY,cameraMotion.angleX};return p.data();}
API(camera_apply) void camera_apply(u32 operation){switch(operation){case 0:cameraMotion.reset_parameters();break;case 1:cameraMotion.advance(motions[0],motions[1]);break;case 2:cameraMotion.snap();break;case 3:cameraMotion.initialize(motions[0],motions[1]);break;}}

API(quad_scale) void quad_scale(QuadPoints* p,float cx,float cy,float cz,float x,float y,float z){scale_quad(*p,cx,cy,cz,x,y,z);}
#include "../../cpp/game/SpriteRenderer.hpp"
struct CapturedSprite {std::array<u32,7> state{};std::array<ScreenVertex,4> vertices{};};
static std::vector<CapturedSprite> spriteDraws;
struct SpriteCapture:CaptureGraphics {
    void draw(u32 t,Topology top,const ScreenVertex* v,u32 count)override{
        CaptureGraphics::draw(t,top,v,count);CapturedSprite d;d.state={t,u32(top),u32(state.sourceBlend),u32(state.destinationBlend),u32(state.depthWrite),state.color.operation==ColorOperation::LuminanceMultiply, count};std::copy(v,v+std::min(count,4u),d.vertices.begin());spriteDraws.push_back(d);
    }
};
struct SpriteTestResources:SpriteResources {SpriteImage current;SpriteImage image(i16)override{return current;}};
static SpriteCapture spriteCapture;static ZunGraphics spriteGraphics(spriteCapture);static SpriteTestResources spriteResources;static SpriteRenderer spriteRenderer(spriteGraphics,spriteResources);static SpriteTrails spriteTrails;
static ImageFrame sprite_test_frame(const u8* p){
    ImageFrame f;f.originX=fixture_read<i16>(p,0);f.originY=fixture_read<i16>(p,2);f.duration=fixture_read<u16>(p,4);f.sprite=fixture_read<u16>(p,6);f.basicVisual=p[12];f.hasVisual=p[8];
    const u8* v=p+84;f.visual.mode=v[0];f.visual.alpha=v[1];f.visual.red=v[2];f.visual.green=v[3];f.visual.blue=v[4];std::memcpy(f.visual.projection.data(),v+6,6);std::memcpy(f.visual.scale.data(),v+12,12);std::memcpy(f.visual.rotation.data(),v+24,12);return f;
}
API(sprite_configure) void sprite_configure(u32 w,u32 h,u32 texw,u32 texh,float scale,float x,float y,float multiplier){spriteResources.current={77,w,h};spriteCapture.size={texw,texh};spriteGraphics.drawScale=scale;spriteGraphics.originX=x;spriteGraphics.originY=y;spriteGraphics.colorMultiplier=multiplier;}
API(sprite_history_configure) void sprite_history_configure(i32 interval,i32 maximum,u32 color){spriteTrails.interval=i8(interval);spriteTrails.maximum=i16(maximum);spriteTrails.colorMask=color;}
API(sprite_history_clear) void sprite_history_clear(){spriteTrails.clear();}
API(sprite_draw) void sprite_draw(const u8* p,const u8* frame,float cameraX,float cameraY,i32 disabled,i32 trim){
    FighterMotion motion;motion.x=fixture_read<float>(p,0x44);motion.y=fixture_read<float>(p,0x48);motion.facing=i8(p[0x66]);
    SpritePose pose;pose.active=p[0x40];pose.flags=p[0x10];pose.color=(u32(p[0x11])<<24)|(u32(p[0x12])<<16)|(u32(p[0x13])<<8)|p[0x14];std::memcpy(pose.projection.data(),p+0x16,6);std::memcpy(pose.scale.data(),p+0x1c,12);std::memcpy(pose.rotation.data(),p+0x28,12);std::memcpy(pose.offset.data(),p+0x34,12);spriteDraws.clear();
    spriteRenderer.fighter(sprite_test_frame(frame),motion,pose,fixture_read<i16>(p,0x60),fixture_read<i16>(p,0x82),i8(p[0x484]),fixture_read<i32>(p,0x47c),spriteTrails,{disabled!=0,trim!=0},cameraX,cameraY);
}
API(sprite_trails_draw) void sprite_trails_draw(float cameraX,float cameraY){spriteDraws.clear();spriteRenderer.trails(spriteTrails,cameraX,cameraY);}
API(sprite_draw_count) u32 sprite_draw_count(){return spriteDraws.size();}
API(sprite_draw_data) const CapturedSprite* sprite_draw_data(u32 i){return &spriteDraws.at(i);}
API(sprite_history_size) u32 sprite_history_size(){return spriteTrails.entries.size();}
API(sprite_history_data) const u8* sprite_history_data(u32 i){
    static std::array<u8,164> data{};data.fill(0);const auto& e=spriteTrails.entries.at(i);const auto put=[&](u32 at,const auto& v){std::memcpy(data.data()+at,&v,sizeof(v));};put(0,e.sprite);put(4,e.points);put(0x88,e.worldX);put(0x8c,e.worldY);put(0x90,e.projection);put(0x9c,e.color);data[0xa0]=e.blend;return data.data();
}
#include "../../cpp/game/FighterActor.hpp"
static FighterActor actorFixture;static std::array<u8,0x1000> actorRaw;
static std::array<u8,2> actionHudAlpha{255,255};static u8 actionCompletedStages=0,actionRoute=0;
struct ActorCoreCapture:FighterCoreEvents {void reset_hud_alpha()override{actionHudAlpha={255,255};}std::vector<i32> events;void clear_owned_objects(FighterActor& a)override{events.insert(events.end(),{1,a.side});}void spell_attempt(u8 card)override{events.insert(events.end(),{2,card});}};
static ActorCoreCapture actorCoreEvents;static ReplayRandom actorRandom;
struct ActorActionCapture:FighterActionCallbacks {std::vector<i32> events;void movement_commands(FighterActor& a)override{events.push_back(1);a.movement.select(a.motion,motions[1],a.controls.current,a.animation);}void attack_commands(FighterActor&)override{events.push_back(2);}};
static ActorActionCapture actorActionEvents;
static void actor_fixture_fields(bool load){
    auto& a=actorFixture;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,actorRaw.data()+at,sizeof(v));else std::memcpy(actorRaw.data()+at,&v,sizeof(v));};
    const auto flag=[&](u32 at,bool& v){if(load)v=actorRaw[at]!=0;else actorRaw[at]=v;};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(actorRaw[0x11])<<24)|(u32(actorRaw[0x12])<<16)|(u32(actorRaw[0x13])<<8)|actorRaw[0x14];else for(u32 i=0;i<4;i++)actorRaw[0x11+i]=u8(a.pose.color>>(24-i*8));field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);flag(0x40,a.pose.active);field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.remainingHits);field(0x82,a.combat.freeze);field(0x84,a.combat.recoveryTimers[0]);field(0x86,a.combat.recoveryTimers[1]);field(0x88,a.combat.recoveryTimers[2]);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.damage.fighterPower);field(0xa4,a.damage.sourceModifier);
    field(0x2f0,a.effectVisual.mode);field(0x2f1,a.effectVisual.alpha);field(0x2f2,a.effectVisual.red);field(0x2f3,a.effectVisual.green);field(0x2f4,a.effectVisual.blue);field(0x2f6,a.effectVisual.projection);field(0x2fc,a.effectVisual.scale);field(0x308,a.effectVisual.rotation);
    field(0x2d8,a.combat.screenBounds);field(0x2d0,a.score);field(0x2cc,a.side);flag(0x2cd,a.combat.storyOpponent);field(0x314,a.launchParameters);field(0x324,a.combat.health);field(0x326,a.combat.maximumHealth);field(0x328,a.collisionHealth);
    field(0x366,a.selectedSpell);field(0x368,a.combat.spellCharge);field(0x36c,a.combat.spellExtent);field(0x32a,a.phaseKinds);field(0x370,a.phaseVariants);field(0x384,a.cardIds);field(0x398,a.spellChoices);field(0x39c,a.combat.spellEnded);field(0x39d,a.combat.spellPhase);field(0x3a0,a.combat.spellTimer);field(0x3a2,a.spellElapsed);field(0x3a4,a.combat.spellValue);field(0x3a8,a.combat.spellFrames);field(0x3ac,a.carryMomentum);field(0x3ad,a.movement.usedAirDashes);field(0x3ae,a.movement.usedAirJumps);
    field(0x3b0,a.combat.spirit);field(0x3b2,a.combat.previousSpirit);field(0x3b4,a.combat.spiritDelay);field(0x3b6,a.combat.spiritBreak);field(0x3b8,a.motion.hitFreeze);field(0x3ba,a.combat.opponentStop);field(0x3bc,a.combat.recoveryTimers[3]);flag(0x3be,a.allowPush);
    field(0x3c0,a.damage.comboScale);field(0x3c4,a.damage.comboHits);field(0x3c6,a.damage.comboDamage);field(0x3c8,a.movement.recoveryDelay);field(0x3ca,a.combat.armorHits);field(0x3cc,a.combat.actionDelay);flag(0x3ce,a.damageDisabled);flag(0x3cf,a.transitionReady);field(0x3d0,a.phaseStartValues);field(0x400,a.phaseBonuses);flag(0x464,a.perfectSpell);flag(0x465,a.guardEstablished);
    field(0x460,a.stageClearBonus);field(0x33e,a.phaseMaximum);field(0x39e,a.storyPhaseCount);field(0x430,a.combat.spellDrain);field(0x47c,a.combat.noticeTimer);field(0x484,a.combat.flashTimer);field(0x488,a.motion.pushX);field(0x48c,a.carryPush);field(0x490,a.motion.opponentPush);
    field(0x2d8,a.combat.screenBounds);field(0x4c0,a.rawInputs);field(0x4e4,a.confirmCount);field(0x532,a.portraitMaximum);field(0x6f0,a.dialogue.label);field(0x6f2,a.dialogue.branches);field(0x6f4,a.dialogue.record);field(0x6f6,a.dialogue.part);field(0x4dc,a.controls.current.horizontal);field(0x4e0,a.controls.current.vertical);field(0x4e8,a.controls.current.buttons);field(0x4f8,a.controls.buffered);field(0x510,a.controls.bufferTimer);field(0x511,a.command);field(0x512,a.commandTimers);
    field(0x52c,a.training.guard);field(0x52d,a.trainingSpell);field(0x52e,a.training.recovery);field(0x52f,a.training.counter);field(0x530,a.training.direction);field(0x531,a.training.position);field(0x538,a.combat.fade);field(0x539,a.fadeKind);
    field(0x6e6,a.notice.mode);field(0x6e7,a.noticePortrait);field(0x6e8,a.notice.visible);field(0x6e9,a.notice.brightness);field(0x6ea,a.notice.duration);field(0x6ec,a.notice.level);field(0x6ee,a.notice.dialogueVisible);flag(0x6ef,a.dialogueFinished);
    field(0x6f8,a.scriptCursor.waiting);field(0x6fa,a.scriptCursor.musicDelay);field(0x6fc,a.scriptCursor.musicId);field(0xef8,a.combat.elapsed);field(0xefa,a.knockdownTime);
}
API(actor_load) void actor_load(const u8* p,u32 seed){actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);actorFixture.animation.pattern=&patterns;actorFixture.animation.set(actorFixture.animation.cursor.action,actorFixture.animation.cursor.index,actorFixture.animation.cursor.elapsed);actorRandom.state=seed;actorCoreEvents.events.clear();actorActionEvents.events.clear();}
API(actor_snapshot) const u8* actor_snapshot(){actor_fixture_fields(false);return actorRaw.data();}
API(actor_reset_round) void actor_reset_round(){actorFixture.reset_round(actorCoreEvents);}
API(actor_begin_spell) void actor_begin_spell(u32 mode,u32 replayMode){actorFixture.begin_spell(GameMode(mode),u8(replayMode),actorCoreEvents);}
API(actor_events) const i32* actor_events(){return actorCoreEvents.events.data();}
API(actor_event_count) u32 actor_event_count(){return actorCoreEvents.events.size();}
API(actor_polar_velocity) void actor_polar_velocity(float degrees,float speed){actorFixture.set_polar_velocity(degrees,speed);}
API(actor_guarded_commands) void actor_guarded_commands(u32 mode,i32 freeze){FighterActor other;other.motion=motions[1];other.motion.hitFreeze=i16(freeze);actorFixture.guarded_commands(other,GameMode(mode),actorRandom,actorActionEvents);}
API(actor_actions) const i32* actor_actions(){return actorActionEvents.events.data();}
API(actor_action_count) u32 actor_action_count(){return actorActionEvents.events.size();}
API(actor_random_state) u32 actor_random_state(){return actorRandom.state;}
API(actor_frame) const PatternFrame* actor_frame(){return actorFixture.animation.frame;}
#include "../../cpp/game/ReimuRecovery.hpp"
static ReimuRecoveryState reimuRecovery;
struct RecoveryCapture:FighterActionEvents {
    bool captureDrawFlags=false;std::array<u8,2>& hud_alpha()override{return actionHudAlpha;}u8& completed_stages()override{return actionCompletedStages;}u8& route()override{return actionRoute;}CameraMotion& camera()override{return cameraMotion;}
    u32 fadeColor=0;u8 fadeAlpha=0;u32& fade_color()override{return fadeColor;}u8& fade_alpha()override{return fadeAlpha;}
    std::vector<i32> events;static i32 bits(float f){i32 n;std::memcpy(&n,&f,4);return n;}
    void sound(i16 id)override{events.insert(events.end(),{1,id});}
    void effect(FighterEffectSpace space,i16 id,float x,float y,i8 facing,u8 layer,const std::array<float,4>& parameters,u8 contactDelay,const FrameVisual* visual,u8 alternateDraw,u8 shadow)override{events.insert(events.end(),{2,i32(space),id,bits(x),bits(y),facing,layer});for(float value:parameters)events.push_back(bits(value));events.push_back(contactDelay);if(visual){events.insert(events.end(),{4,visual->mode,visual->alpha,visual->red,visual->green,visual->blue});for(auto v:visual->projection)events.push_back(v);for(auto v:visual->scale)events.push_back(bits(v));for(auto v:visual->rotation)events.push_back(bits(v));}if(captureDrawFlags&&(alternateDraw||shadow))events.insert(events.end(),{5,alternateDraw,shadow});}
    void shake(float value)override{events.insert(events.end(),{3,bits(value)});}
};
static RecoveryCapture recoveryCapture;
API(action_scene_load) void action_scene_load(u32 first,u32 second,u32 completed,u32 route){actionHudAlpha={u8(first),u8(second)};actionCompletedStages=u8(completed);actionRoute=u8(route);}
API(action_scene_snapshot) const u8* action_scene_snapshot(){static std::array<u8,4> s;s={actionHudAlpha[0],actionHudAlpha[1],actionCompletedStages,actionRoute};return s.data();}
API(capture_effect_draw_flags) void capture_effect_draw_flags(u32 enabled){recoveryCapture.captureDrawFlags=enabled;}
API(reimu_recovery_load) void reimu_recovery_load(const u8* p,i32 interval,i32 maximum,u32 color){reimuRecovery.loops=fixture_read<i16>(p,0xf00);reimuRecovery.impactVelocity=fixture_read<i16>(p,0xf02);reimuRecovery.smokeEmitted=fixture_read<i16>(p,0xf0c);reimuRecovery.boundaryAngle=fixture_read<i16>(p,0xf26);actorFixture.trails.interval=i8(interval);actorFixture.trails.maximum=i16(maximum);actorFixture.trails.colorMask=color;recoveryCapture.events.clear();}
API(reimu_recovery_advance) int reimu_recovery_advance(const u8* p,u32 mode){FighterActor opponent;opponent.motion.x=fixture_read<float>(p,0x44);opponent.motion.y=fixture_read<float>(p,0x48);opponent.animation.cursor.action=fixture_read<i16>(p,0x60);opponent.combat.opponentStop=fixture_read<i16>(p,0x3ba);return advance_reimu_recovery(actorFixture,opponent,reimuRecovery,GameMode(mode),recoveryCapture);}
API(reimu_recovery_snapshot) const u8* reimu_recovery_snapshot(){actor_snapshot();const auto put=[&](u32 at,const auto& v){std::memcpy(actorRaw.data()+at,&v,sizeof(v));};put(0xf00,reimuRecovery.loops);put(0xf02,reimuRecovery.impactVelocity);put(0xf0c,reimuRecovery.smokeEmitted);put(0xf26,reimuRecovery.boundaryAngle);return actorRaw.data();}
API(reimu_recovery_trails) const u32* reimu_recovery_trails(){static std::array<u32,3> values;values={u32(i32(actorFixture.trails.interval)),u32(i32(actorFixture.trails.maximum)),actorFixture.trails.colorMask};return values.data();}
API(reimu_recovery_events) const i32* reimu_recovery_events(){return recoveryCapture.events.data();}
API(reimu_recovery_event_count) u32 reimu_recovery_event_count(){return recoveryCapture.events.size();}
#include "../../cpp/game/ReimuAttacks.hpp"
static std::array<u8,0x1000> reimuOtherRaw;
API(reimu_attack_advance) int reimu_attack_advance(const u8* p){FighterActor opponent;std::memcpy(reimuOtherRaw.data(),p,reimuOtherRaw.size());opponent.combat.opponentStop=fixture_read<i16>(p,0x3ba);opponent.knockdownTime=fixture_read<i16>(p,0xefa);const bool done=advance_reimu_melee(actorFixture,opponent,reimuRecovery,recoveryCapture)||advance_reimu_shooting(actorFixture,opponent,reimuRecovery,recoveryCapture);std::memcpy(reimuOtherRaw.data()+0xefa,&opponent.knockdownTime,2);return done;}
API(reimu_attack_other) const u8* reimu_attack_other(){return reimuOtherRaw.data();}
#include "../../cpp/game/ReimuRanged.hpp"
API(reimu_ranged_advance) int reimu_ranged_advance(const u8* p){FighterActor opponent;opponent.motion.x=fixture_read<float>(p,0x44);opponent.combat.opponentStop=fixture_read<i16>(p,0x3ba);return advance_reimu_ranged(actorFixture,opponent,reimuRecovery,replayStreams,recoveryCapture)||advance_reimu_special_melee(actorFixture,opponent,reimuRecovery,recoveryCapture);}
#include "../../cpp/game/ReimuSpells.hpp"
API(reimu_spell_advance) int reimu_spell_advance(const u8* p,u32 mode,i32 difficulty,u32 replayMode){FighterActor opponent;std::memcpy(reimuOtherRaw.data(),p,reimuOtherRaw.size());opponent.motion.x=fixture_read<float>(p,0x44);opponent.motion.opponentPush=fixture_read<float>(p,0x490);opponent.combat.opponentStop=fixture_read<i16>(p,0x3ba);opponent.combat.health=fixture_read<i16>(p,0x324);opponent.combat.spellPhase=p[0x39d];opponent.animation.cursor.action=fixture_read<i16>(p,0x60);opponent.animation.cursor.index=fixture_read<i16>(p,0x62);opponent.animation.pattern=&patterns;opponent.animation.set(opponent.animation.cursor.action,opponent.animation.cursor.index,fixture_read<i16>(p,0x64));opponent.transitionReady=p[0x3cf]!=0;const bool done=advance_reimu_spells(actorFixture,opponent,reimuRecovery,GameMode(mode),i8(difficulty),u8(replayMode),replayStreams,actorCoreEvents,recoveryCapture);std::memcpy(reimuOtherRaw.data()+0x490,&opponent.motion.opponentPush,4);reimuOtherRaw[0x3cf]=opponent.transitionReady;const auto put=[&](u32 at,const auto& value){std::memcpy(reimuOtherRaw.data()+at,&value,sizeof(value));};put(0x60,opponent.animation.cursor.action);put(0x62,opponent.animation.cursor.index);put(0x64,opponent.animation.cursor.elapsed);put(0x70,opponent.animation.cursor.frameCount);put(0x72,opponent.animation.cursor.duration);return done;}
#include "../../cpp/game/ReimuCommands.hpp"
API(actor_history_load) void actor_history_load(const u8* p){std::memcpy(actorFixture.controls.history.frames.data(),p,90);}
API(actor_history_snapshot) const u8* actor_history_snapshot(){return actorFixture.controls.history.frames.data();}
API(reimu_commands) void reimu_commands(const u8* p,i32 seals){FighterActor opponent;opponent.motion.x=fixture_read<float>(p,0x44);select_reimu_commands(actorFixture,opponent,{i16(seals)});}

#include "../../cpp/game/ReimuInputs.hpp"
#include "../../cpp/game/ReimuFrame.hpp"
static ReimuFrameState reimuFrame;
API(reimu_input_command) u32 reimu_input_command(const u8* p,i32 facing){InputHistory history;std::memcpy(history.frames.data(),p,90);return recognize_reimu_command(history,i8(facing));}
API(reimu_frame_load) void reimu_frame_load(const u8* p){reimuFrame.blockEffectSent=fixture_read<i16>(p,0xf0a);reimuFrame.farRangeFrames=fixture_read<i16>(p,0xf2a);recoveryCapture.events.clear();}
API(reimu_frame_advance) void reimu_frame_advance(const u8* p){FighterActor opponent;opponent.motion.x=fixture_read<float>(p,0x44);advance_reimu_frame(actorFixture,opponent,reimuFrame,recoveryCapture);}
API(reimu_frame_snapshot) const u8* reimu_frame_snapshot(){actor_snapshot();std::memcpy(actorRaw.data()+0xf0a,&reimuFrame.blockEffectSent,2);std::memcpy(actorRaw.data()+0xf2a,&reimuFrame.farRangeFrames,2);return actorRaw.data();}

#include "../../cpp/game/ReimuObjects.hpp"
static ReimuObject reimuObject;static ReimuState reimuObjectOwner;
static std::array<u8,0xe8> reimuObjectRaw;
static void object_fixture_fields(bool load){
    auto& a=reimuObject;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,reimuObjectRaw.data()+at,sizeof(v));else std::memcpy(reimuObjectRaw.data()+at,&v,sizeof(v));};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(reimuObjectRaw[0x11])<<24)|(u32(reimuObjectRaw[0x12])<<16)|(u32(reimuObjectRaw[0x13])<<8)|reimuObjectRaw[0x14];else for(u32 i=0;i<4;i++)reimuObjectRaw[0x11+i]=u8(a.pose.color>>(24-i*8));
    field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);if(load)a.pose.active=reimuObjectRaw[0x40]!=0;else reimuObjectRaw[0x40]=a.pose.active;
    field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x67,a.order);field(0x68,a.group);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.hits);field(0x82,a.freeze);field(0x84,a.recoveryTimers);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.sourcePower);field(0xa4,a.sourceModifier);
    field(0xc8,a.parameters);field(0xd8,a.counter);field(0xda,a.timer);field(0xdc,a.angle);field(0xde,a.cycle);field(0xe0,a.variant);
}
API(reimu_object_load) void reimu_object_load(const u8* p,const u8* owner,i32 difficulty){reimuObject={};std::memcpy(reimuObjectRaw.data(),p,reimuObjectRaw.size());object_fixture_fields(true);reimuObject.animation.pattern=&patterns;reimuObject.animation.set(reimuObject.animation.cursor.action,reimuObject.animation.cursor.index,reimuObject.animation.cursor.elapsed);reimuObject.alive=true;
    actor_load(owner,0);reimuObjectOwner.difficulty=i8(difficulty);reimuObjectOwner.volleyMode=fixture_read<i16>(owner,0xf28);reimuObjectOwner.commands.activeSeals=fixture_read<i16>(owner,0xf22);reimuObjectOwner.frame.blockEffectSent=fixture_read<i16>(owner,0xf0a);reimuObjectOwner.frame.farRangeFrames=fixture_read<i16>(owner,0xf2a);reimuObjectOwner.recovery.smokeEmitted=fixture_read<i16>(owner,0xf0c);reimuObjectOwner.orbitAngle=fixture_read<i16>(owner,0xf24);reimuObjectOwner.recovery.boundaryAngle=fixture_read<i16>(owner,0xf26);recoveryCapture.events.clear();}
API(reimu_object_advance) void reimu_object_advance(const u8* p){FighterActor opponent;std::memcpy(reimuOtherRaw.data(),p,reimuOtherRaw.size());opponent.motion.x=fixture_read<float>(p,0x44);opponent.motion.y=fixture_read<float>(p,0x48);opponent.motion.facing=i8(p[0x66]);opponent.combat.opponentStop=fixture_read<i16>(p,0x3ba);opponent.combat.spirit=fixture_read<i16>(p,0x3b0);opponent.combat.spiritBreak=fixture_read<i16>(p,0x3b6);opponent.combat.spellEnded=p[0x39c];opponent.combat.spellExtent=fixture_read<float>(p,0x36c);opponent.selectedSpell=p[0x366];opponent.score=fixture_read<i32>(p,0x2d0);
    advance_reimu_object(reimuObject,actorFixture,opponent,reimuObjectOwner,replayStreams,recoveryCapture);
    std::memcpy(reimuOtherRaw.data()+0x3b0,&opponent.combat.spirit,2);std::memcpy(reimuOtherRaw.data()+0x3b6,&opponent.combat.spiritBreak,2);std::memcpy(reimuOtherRaw.data()+0x36c,&opponent.combat.spellExtent,4);reimuOtherRaw[0x366]=opponent.selectedSpell;std::memcpy(reimuOtherRaw.data()+0x2d0,&opponent.score,4);}
API(reimu_object_snapshot) const u8* reimu_object_snapshot(){object_fixture_fields(false);return reimuObjectRaw.data();}
API(reimu_object_alive) u32 reimu_object_alive(){return reimuObject.alive;}
API(reimu_object_owner) const u8* reimu_object_owner(){actor_snapshot();const auto put=[&](u32 at,const auto& v){std::memcpy(actorRaw.data()+at,&v,sizeof(v));};put(0xf22,reimuObjectOwner.commands.activeSeals);put(0xf0a,reimuObjectOwner.frame.blockEffectSent);put(0xf2a,reimuObjectOwner.frame.farRangeFrames);put(0xf0c,reimuObjectOwner.recovery.smokeEmitted);put(0xf24,reimuObjectOwner.orbitAngle);put(0xf26,reimuObjectOwner.recovery.boundaryAngle);put(0xf28,reimuObjectOwner.volleyMode);return actorRaw.data();}

#include "../../cpp/game/ReimuCharacter.hpp"
static ReimuCharacter reimuCharacter;
API(reimu_character_load) void reimu_character_load(const u8* p,i32 interval,u32 mask,i32 difficulty){actor_load(p,0);reimu_recovery_load(p,interval,32,mask);
    reimuCharacter.actor=actorFixture;auto& s=reimuCharacter.state;s.recovery=reimuRecovery;s.commands.activeSeals=fixture_read<i16>(p,0xf22);s.frame.blockEffectSent=fixture_read<i16>(p,0xf0a);s.frame.farRangeFrames=fixture_read<i16>(p,0xf2a);s.orbitAngle=fixture_read<i16>(p,0xf24);s.volleyMode=fixture_read<i16>(p,0xf28);s.difficulty=i8(difficulty);std::memcpy(s.actionCounters.data(),p+0xf04,6);s.introWait=fixture_read<i16>(p,0xefc);s.captionWait=fixture_read<i16>(p,0xefe);}
API(reimu_character_reset) void reimu_character_reset(){reimuCharacter.reset(actorCoreEvents);}
API(reimu_character_advance) void reimu_character_advance(const u8* p,u32 mode){FighterActor opponent;std::memcpy(reimuOtherRaw.data(),p,reimuOtherRaw.size());opponent.motion.x=fixture_read<float>(p,0x44);opponent.motion.y=fixture_read<float>(p,0x48);opponent.motion.opponentPush=fixture_read<float>(p,0x490);opponent.combat.opponentStop=fixture_read<i16>(p,0x3ba);opponent.knockdownTime=fixture_read<i16>(p,0xefa);opponent.combat.health=fixture_read<i16>(p,0x324);opponent.combat.spellPhase=p[0x39d];opponent.animation.pattern=&patterns;opponent.animation.set(fixture_read<i16>(p,0x60),fixture_read<i16>(p,0x62),fixture_read<i16>(p,0x64));opponent.transitionReady=p[0x3cf]!=0;
    reimuCharacter.advance_action(opponent,GameMode(mode),replayStreams,0,actorCoreEvents,recoveryCapture);const auto put=[&](u32 at,const auto& v){std::memcpy(reimuOtherRaw.data()+at,&v,sizeof(v));};put(0x490,opponent.motion.opponentPush);put(0xefa,opponent.knockdownTime);reimuOtherRaw[0x3cf]=opponent.transitionReady;put(0x60,opponent.animation.cursor.action);put(0x62,opponent.animation.cursor.index);put(0x64,opponent.animation.cursor.elapsed);put(0x70,opponent.animation.cursor.frameCount);put(0x72,opponent.animation.cursor.duration);}
API(reimu_character_snapshot) const u8* reimu_character_snapshot(){actorFixture=reimuCharacter.actor;reimuRecovery=reimuCharacter.state.recovery;reimu_recovery_snapshot();const auto& s=reimuCharacter.state;const auto put=[&](u32 at,const auto& v){std::memcpy(actorRaw.data()+at,&v,sizeof(v));};put(0xf22,s.commands.activeSeals);put(0xf0a,s.frame.blockEffectSent);put(0xf2a,s.frame.farRangeFrames);put(0xf24,s.orbitAngle);put(0xf28,s.volleyMode);put(0xf04,s.actionCounters);put(0xefc,s.introWait);put(0xefe,s.captionWait);return actorRaw.data();}

#include "../../cpp/game/ReimuAI.hpp"
static CharacterAIContext reimuAIContext;
API(reimu_ai_load) void reimu_ai_load(i32 duel,i32 story){reimuAIContext={duel,story};}
API(reimu_ai_advance) void reimu_ai_advance(const u8* p,u32 story){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);other.motion.y=fixture_read<float>(p,0x48);other.animation.cursor.action=fixture_read<i16>(p,0x60);if(story)choose_reimu_story_input(reimuCharacter.actor,other,replayStreams.random,reimuAIContext);else choose_reimu_duel_input(reimuCharacter.actor,other,replayStreams.random,reimuAIContext);}
API(reimu_ai_walk) i32 reimu_ai_walk(u32 story){return story?reimuAIContext.storyWalkFrames:reimuAIContext.duelWalkFrames;}

#include "../../cpp/game/StorySequence.hpp"
static StoryEnvironment storyEnvironment;static FighterActor storyOther;static std::array<u8,0x1000> storyOtherRaw;
static void story_cutscene_fields(bool load){auto& s=reimuCharacter.state.story;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,actorRaw.data()+at,sizeof(v));else std::memcpy(actorRaw.data()+at,&v,sizeof(v));};field(0x6e4,s.step);field(0x6e5,s.opponent);field(0x713,s.nextStage);for(u32 i=0;i<4;i++){field(0xf2c+i*4,s.x[i]);field(0xf54+i*4,s.y[i]);field(0xff4+i,s.alpha[i]);}}
API(reimu_story_setup) void reimu_story_setup(const u8* other,const u8* settings){const auto originalActor=actorFixture;const auto savedRaw=actorRaw;actor_load(other,0);storyOther=actorFixture;storyOtherRaw=actorRaw;actorFixture=originalActor;actorRaw=savedRaw;story_cutscene_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);initialize_reimu_story(reimuCharacter.actor,storyOther,reimuCharacter.state.story,storyEnvironment);}
API(reimu_story_snapshot) const u8* reimu_story_snapshot(){reimu_character_snapshot();story_cutscene_fields(false);return actorRaw.data();}
API(reimu_story_other) const u8* reimu_story_other(){const auto save=actorFixture;const auto savedRaw=actorRaw;actorFixture=storyOther;actorRaw=storyOtherRaw;actor_fixture_fields(false);storyOtherRaw=actorRaw;actorFixture=save;actorRaw=savedRaw;return storyOtherRaw.data();}
API(reimu_story_environment) const u8* reimu_story_environment(){static std::array<u8,12> p;p[0]=storyEnvironment.stage;p[1]=storyEnvironment.difficulty;p[2]=storyEnvironment.background;p[3]=storyEnvironment.fadeAlpha;std::memcpy(p.data()+4,&storyEnvironment.fadeColor,4);p[8]=storyEnvironment.completedStages;p[9]=storyEnvironment.route;return p.data();}
API(reimu_story_camera) const float* reimu_story_camera(){static std::array<float,8> p;auto& v=storyEnvironment.camera;p={float(v.fixed),v.fixedX,v.fixedY,v.fixedSpan,v.x,v.span,v.smoothY,v.y};return p.data();}

struct StoryDraw {u32 texture=0,filter=0;std::array<ScreenVertex,4> vertices;};
static std::vector<StoryDraw> storyDraws;
struct StoryGraphicsCapture:CaptureGraphics {TextureSize texture_size(u32 t)override{return std::array<TextureSize,4>{{{1024,32},{1024,32},{1024,128},{512,128}}}[t];}void draw(u32 t,Topology,const ScreenVertex* v,u32)override{StoryDraw d;d.texture=t;d.filter=u32(state.minFilter);std::copy(v,v+4,d.vertices.begin());storyDraws.push_back(d);}};
static StoryGraphicsCapture storyGraphicsCapture;static ZunGraphics storyGraphics(storyGraphicsCapture);
API(reimu_story_draw) u32 reimu_story_draw(u32 stage,u32 filter){story_cutscene_fields(true);storyGraphics.filter(Filter(filter));storyDraws.clear();reimuCharacter.state.story.render(u8(stage),reimuCharacter.actor,reimuCharacter.state.captionWait,storyGraphics,{0,1,2,3});return storyDraws.size();}
API(reimu_story_draw_data) const StoryDraw* reimu_story_draw_data(u32 i){return &storyDraws.at(i);}

#include "../../cpp/game/ReimuStory.hpp"
struct StoryEventCapture:StoryEvents {std::vector<i32> events;u32 dialogueMask=0,calls=0;FighterActor* player=nullptr;i32 side(FighterActor& a){return &a==(player?player:&reimuCharacter.actor)?0:1;}void begin_dialogue(i16 n)override{events.insert(events.end(),{1,n});}void show_dialogue(bool b)override{events.insert(events.end(),{2,i32(b)});}bool advance_dialogue()override{bool b=(dialogueMask>>(calls++%32))&1;events.insert(events.end(),{3,i32(b)});return b;}void hide_portrait(FighterActor& a)override{events.insert(events.end(),{4,side(a)});}void show_portrait(FighterActor& a,u8 p,u8 d)override{events.insert(events.end(),{5,side(a),p,d});}void advance_portrait(FighterActor& a)override{events.insert(events.end(),{6,side(a)});}void reload_stage(u8 n)override{events.insert(events.end(),{7,n});}void select_music(i16 n)override{events.insert(events.end(),{8,n});}void start_music()override{events.push_back(9);}void stop_music()override{events.push_back(10);}void replace_text(bool erase)override{events.insert(events.end(),{11,i32(erase)});}void sound(i16 id)override{events.insert(events.end(),{12,id});}};
static StoryEventCapture storyEventCapture;
API(reimu_story_load) void reimu_story_load(const u8* other,const u8* settings,u32 dialogueMask){const auto save=actorFixture;const auto savedRaw=actorRaw;actor_load(other,0);storyOther=actorFixture;storyOtherRaw=actorRaw;actorFixture=save;actorRaw=savedRaw;story_cutscene_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);storyEnvironment.completedStages=settings[8];storyEnvironment.route=settings[9];storyEventCapture.events.clear();storyEventCapture.dialogueMask=dialogueMask;storyEventCapture.calls=0;}
API(reimu_story_advance) void reimu_story_advance(){advance_reimu_story(reimuCharacter.actor,storyOther,reimuCharacter.state.story,reimuCharacter.state.introWait,storyEnvironment,storyEventCapture);}
API(reimu_story_events) const i32* reimu_story_events(){return storyEventCapture.events.data();}
API(reimu_story_event_count) u32 reimu_story_event_count(){return storyEventCapture.events.size();}

#include "../../cpp/game/StoryDialogue.hpp"
struct DialogueCapture:DialoguePlatform {std::vector<i32> events;static i32 bits(float f){i32 n;std::memcpy(&n,&f,4);return n;}void text(const std::string& text,u8 r,u8 g,u8 b,u32 size,u8 part,bool continuation)override{u32 hash=2166136261u;for(u8 c:text)hash=(hash^c)*16777619u;events.insert(events.end(),{1,i32(hash),r,g,b,i32(size),part,i32(continuation)});}void origin(float x,float y,bool layout)override{events.insert(events.end(),{2,bits(x),bits(y),i32(layout)});}void select_music(i16 id)override{events.insert(events.end(),{3,id});}void start_music()override{events.push_back(4);}};
static DialogueCapture dialogueCapture;static StoryDialogueCache dialogueCache;
API(dialogue_records) void dialogue_records(const u8* p,u32 count){story.labels.fill(-1);story.labels[42]=0;story.blocks={std::vector<StoryRecord>(count)};for(u32 i=0;i<count;i++){auto& r=story.blocks[0][i];r.kind=StoryCommand(p[i*4]);r.argument=fixture_read<i16>(p,i*4+2);r.text="line-"+std::to_string(i);}}
API(dialogue_load) void dialogue_load(const u8* other,i32 record,i32 part){const auto save=actorFixture;const auto raw=actorRaw;actor_load(other,0);storyOther=actorFixture;storyOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;dialogueCapture.events.clear();dialogueCache={i8(record),i8(part)};}
API(dialogue_advance) int dialogue_advance(u32 stage,u32 automatic){return advance_story_dialogue(reimuCharacter.actor,storyOther,story,u8(stage),automatic!=0,dialogueCache,dialogueCapture);}
API(dialogue_begin) void dialogue_begin(i32 label,u32 stage){begin_story_dialogue(reimuCharacter.actor,i16(label),u8(stage),dialogueCapture);}
API(dialogue_portrait) void dialogue_portrait(u32 side,u32 operation,i32 image,u32 visible,u32 shade){auto& a=side?storyOther:reimuCharacter.actor;if(operation==0)set_story_portrait(a,i8(image),u8(visible),u8(shade));else if(operation==1)show_story_portrait(a,u8(image),u8(visible));else advance_story_portrait(a);}
API(dialogue_events) const i32* dialogue_events(){return dialogueCapture.events.data();}
API(dialogue_event_count) u32 dialogue_event_count(){return dialogueCapture.events.size();}
API(dialogue_cache) const i8* dialogue_cache(){return &dialogueCache.record;}

#include "../../cpp/game/BattleStory.hpp"
struct BattleDialogueCapture:BattleStoryPlatform {DialogueCapture capture;void text(const std::string& s,u8 r,u8 g,u8 b,u32 size,u8 part,bool continuation)override{capture.text(s,r,g,b,size,part,continuation);}void origin(float x,float y,bool battleLayout)override{capture.origin(x,y,battleLayout);}void select_music(i16 n)override{capture.select_music(n);}void start_music()override{capture.start_music();}void reload_stage(u8 n)override{capture.events.insert(capture.events.end(),{5,n});}void stop_music()override{capture.events.push_back(6);}void sound(i16 id)override{capture.events.insert(capture.events.end(),{7,id});}};
static BattleDialogueCapture battleDialogueCapture;
API(dialogue_map_labels) void dialogue_map_labels(){for(u32 i=0;i<story.labels.size();i++)story.labels[i]=0;}
API(reimu_story_advance_integrated) void reimu_story_advance_integrated(u32 automatic){battleDialogueCapture.capture.events.clear();BattleStoryEvents events(reimuCharacter.actor,storyOther,story,storyEnvironment,dialogueCache,battleDialogueCapture,automatic!=0);reimuCharacter.advance_story(storyOther,storyEnvironment,events);}
API(reimu_story_integrated_events) const i32* reimu_story_integrated_events(){return battleDialogueCapture.capture.events.data();}
API(reimu_story_integrated_event_count) u32 reimu_story_integrated_event_count(){return battleDialogueCapture.capture.events.size();}

API(sprite_object_draw) void sprite_object_draw(const u8* p,const u8* frame,float cameraX,float cameraY){FighterMotion motion;motion.x=fixture_read<float>(p,0x44);motion.y=fixture_read<float>(p,0x48);motion.facing=i8(p[0x66]);SpritePose pose;pose.active=p[0x40];pose.flags=p[0x10];pose.color=(u32(p[0x11])<<24)|(u32(p[0x12])<<16)|(u32(p[0x13])<<8)|p[0x14];std::memcpy(pose.projection.data(),p+0x16,6);std::memcpy(pose.scale.data(),p+0x1c,12);std::memcpy(pose.rotation.data(),p+0x28,12);std::memcpy(pose.offset.data(),p+0x34,12);spriteDraws.clear();spriteRenderer.object(sprite_test_frame(frame),motion,pose,cameraX,cameraY);}

static OwnedObjects ownedObjectsFixture(reimuCharacter.actor,reimuCharacter);static FighterObject* ownedLast=nullptr;
API(owned_objects_clear) void owned_objects_clear(){ownedObjectsFixture.clear();ownedLast=nullptr;}
API(owned_objects_spawn) int owned_objects_spawn(const u8* p,const u8* v){ObjectRequest r;r.action=fixture_read<i16>(p,0);r.facing=i8(p[2]);r.layer=p[3];r.alternateDraw=p[4];r.shadow=p[5];r.contactDelay=p[6];r.x=fixture_read<float>(p,8);r.y=fixture_read<float>(p,12);std::memcpy(r.parameters.data(),p+16,16);FrameVisual visual;if(v){visual.mode=v[0];visual.alpha=v[1];visual.red=v[2];visual.green=v[3];visual.blue=v[4];std::memcpy(visual.projection.data(),v+6,6);std::memcpy(visual.scale.data(),v+12,12);std::memcpy(visual.rotation.data(),v+24,12);r.visual=&visual;}ownedLast=ownedObjectsFixture.spawn(r);return ownedLast!=nullptr;}
API(owned_objects_last) const u8* owned_objects_last(){reimuObject=*static_cast<ReimuObject*>(ownedLast);reimuObjectRaw.fill(0);object_fixture_fields(false);return reimuObjectRaw.data();}
API(owned_objects_size) u32 owned_objects_size(u32 layer){return ownedObjectsFixture.size(u8(layer));}

struct OwnedPolicyPlan {u8 layer=0,alternate=0,debug=0,alive=1;i16 child=-1,kill=-1,revive=-1;};
struct OwnedPolicyCapture:FighterObjectCallbacks {
    std::vector<OwnedPolicyPlan> plans;std::vector<FighterObject*> objects;std::vector<i32> events;
    void spawn(u32 id){if(id>=plans.size()||objects[id])return;const auto& p=plans[id];ObjectRequest r;r.action=0;r.layer=p.layer;r.alternateDraw=p.alternate;r.shadow=p.debug;r.parameters[0]=float(id);objects[id]=ownedObjectsFixture.spawn(r);objects[id]->alive=p.alive!=0;}
    void update(FighterObject& a)override{const u32 id=u32(a.parameters[0]);events.insert(events.end(),{1,i32(id)});const auto& p=plans[id];if(p.child>=0)spawn(u32(p.child));if(p.kill>=0&&objects[p.kill])objects[p.kill]->alive=false;if(p.revive>=0&&objects[p.revive])objects[p.revive]->alive=true;}
    void draw(FighterObject& a,bool alternate)override{events.insert(events.end(),{alternate?3:2,i32(a.parameters[0])});}
    void shadow(FighterObject& a)override{events.insert(events.end(),{4,i32(a.parameters[0])});}
};
static OwnedPolicyCapture ownedPolicy;
API(owned_policy_load) void owned_policy_load(const u8* raw,u32 count,u32 initial){ownedObjectsFixture.clear();reimuCharacter.actor.animation.pattern=&patterns;ownedPolicy.plans.resize(count);ownedPolicy.objects.assign(count,nullptr);ownedPolicy.events.clear();for(u32 i=0;i<count;i++){auto& p=ownedPolicy.plans[i];p.layer=raw[i*12];p.alternate=raw[i*12+1];p.debug=raw[i*12+2];p.alive=raw[i*12+3];p.child=fixture_read<i16>(raw,i*12+4);p.kill=fixture_read<i16>(raw,i*12+6);p.revive=fixture_read<i16>(raw,i*12+8);}for(u32 i=0;i<initial;i++)ownedPolicy.spawn(i);}
API(owned_policy_advance) void owned_policy_advance(){ownedObjectsFixture.advance(ownedPolicy);}
API(owned_policy_draw) void owned_policy_draw(u32 layer){ownedObjectsFixture.render(u8(layer),ownedPolicy);}
API(owned_policy_shadows) void owned_policy_shadows(){ownedObjectsFixture.render_shadows(ownedPolicy);}
API(owned_policy_events) const i32* owned_policy_events(){return ownedPolicy.events.data();}
API(owned_policy_event_count) u32 owned_policy_event_count(){return ownedPolicy.events.size();}
API(owned_policy_ids) const i32* owned_policy_ids(){static std::vector<i32> ids;ids.clear();for(u32 layer=0;layer<4;layer++)for(u32 i=0;i<ownedObjectsFixture.size(u8(layer));i++){auto& a=ownedObjectsFixture.get(u8(layer),i);ids.insert(ids.end(),{i32(layer),i32(a.parameters[0]),i32(a.alive)});}return ids.data();}

#include "../../cpp/game/BattleContacts.hpp"
static std::array<FighterActor,2> contactActors;
static OwnedObjects contactObjects0(contactActors[0],reimuCharacter),contactObjects1(contactActors[1],reimuCharacter);
static std::array<OwnedObjects*,2> contactObjects{&contactObjects0,&contactObjects1};static std::vector<FighterObject*> contactObjectPointers;
static BattleContacts battleContacts;
struct ContactCapture:BattleContactSignals {std::vector<i32> events;u8 side=0;void select_side(u8 n)override{side=n;}void sound(i32 id)override{events.insert(events.end(),{1,side,id});}void effect(i16 id,i8 facing)override{events.insert(events.end(),{2,side,id,facing});}void combo(i16 hits,i16 damage,i32 scale)override{events.insert(events.end(),{3,side,hits,damage,scale});}};
static ContactCapture contactCapture;
API(contacts_load) void contacts_load(u32 side,const u8* raw){if(side==0){contactObjects0.clear();contactObjects1.clear();contactObjectPointers.clear();contactCapture.events.clear();battleContacts={};}actor_load(raw,1);contactActors[side]=actorFixture;}
API(contacts_object_load) void contacts_object_load(u32 side,u32 layer,const u8* raw){ObjectRequest r;r.action=fixture_read<i16>(raw,0x60);r.layer=u8(layer);auto* p=contactObjects[side]->spawn(r);reimuObject={};std::memcpy(reimuObjectRaw.data(),raw,0xe8);object_fixture_fields(true);reimuObject.animation.pattern=&patterns;reimuObject.animation.set(reimuObject.animation.cursor.action,reimuObject.animation.cursor.index,reimuObject.animation.cursor.elapsed);reimuObject.layer=u8(layer);*static_cast<ReimuObject*>(p)=reimuObject;contactObjectPointers.push_back(p);}
API(contacts_advance) void contacts_advance(u32 mode,u32 phase,u32 difficulty){battleContacts.difficulty=u8(difficulty);pipelineReplay.bind(ReplayMode::Live,nullptr,1);battleContacts.advance({&contactActors[0],&contactActors[1]},contactObjects,GameMode(mode),BattlePhase(phase),pipelineReplay,contactCapture);}
API(contacts_actor) const u8* contacts_actor(u32 side){actorFixture=contactActors[side];actorRaw.fill(0);actor_fixture_fields(false);return actorRaw.data();}
API(contacts_object) const u8* contacts_object(u32 index){reimuObject=*static_cast<ReimuObject*>(contactObjectPointers[index]);reimuObjectRaw.fill(0);object_fixture_fields(false);return reimuObjectRaw.data();}
API(contacts_event_count) u32 contacts_event_count(){return contactCapture.events.size();}
API(contacts_events) const i32* contacts_events(){return contactCapture.events.data();}
API(contacts_bounds) const CollisionRectangle* contacts_bounds(){return &battleContacts.bounds.intersection;}

#include "../../cpp/game/FighterInputs.hpp"
static ReplayRound characterInputRound;static ReplayStreams characterInputStreams;
API(character_input_streams) void character_input_streams(u32 mode,const u8* inputs,u32 ni,const i16* words,u32 nw,const u8* auxiliary,u32 na,u32 seed,i32 duel,i32 story){characterInputRound={};characterInputRound.playerInputs.assign(inputs,inputs+ni);characterInputRound.randomValues.assign(words,words+nw);characterInputRound.auxiliaryInputs.assign(auxiliary,auxiliary+na);characterInputStreams.bind(ReplayMode(mode),&characterInputRound,seed);reimuAIContext={duel,story};}
API(character_input_history_load) void character_input_history_load(const u8* raw){std::copy(raw,raw+90,reimuCharacter.actor.controls.history.frames.begin());}
API(character_input_update) void character_input_update(const u8* other,const i32* live,u32 mode,u32 difficulty){FighterActor opponent;opponent.motion.x=fixture_read<float>(other,0x44);opponent.motion.y=fixture_read<float>(other,0x48);opponent.animation.cursor.action=fixture_read<i16>(other,0x60);ControlCounts counts;counts.horizontal=live[0];counts.vertical=live[1];std::copy(live+2,live+6,counts.buttons.begin());update_character_input(reimuCharacter,opponent,counts,GameMode(mode),characterInputStreams,reimuAIContext,u8(difficulty),live[6]);}
API(character_input_history) const u8* character_input_history(){return reimuCharacter.actor.controls.history.frames.data();}
API(character_input_queue_size) u32 character_input_queue_size(u32 kind){return kind==0?characterInputRound.playerInputs.size():kind==1?characterInputRound.randomValues.size():characterInputRound.auxiliaryInputs.size();}
API(character_input_queue) const void* character_input_queue(u32 kind){return kind==0?static_cast<const void*>(characterInputRound.playerInputs.data()):kind==1?static_cast<const void*>(characterInputRound.randomValues.data()):static_cast<const void*>(characterInputRound.auxiliaryInputs.data());}
API(character_input_rng) u32 character_input_rng(){return characterInputStreams.random.state;}
API(character_input_restrict) void character_input_restrict(u32 phase){restrict_battle_input(reimuCharacter.actor,BattlePhase(phase));}

#include "../../cpp/game/SharedEffects.hpp"
static SharedEffect sharedEffect;static std::array<u8,0x94> sharedEffectRaw;
struct SharedEffectCapture:SharedEffectEvents {std::vector<i32> events;void spawn(i16 id,float x,float y,i8 facing,u8 layer,const std::array<float,4>& p)override{events.insert(events.end(),{id,DialogueCapture::bits(x),DialogueCapture::bits(y),facing,layer});for(float v:p)events.push_back(DialogueCapture::bits(v));}};
static SharedEffectCapture sharedEffectCapture;
static void shared_effect_fields(bool load){auto& e=sharedEffect;const auto field=[&](u32 at,auto& value){if(load)std::memcpy(&value,sharedEffectRaw.data()+at,sizeof(value));else std::memcpy(sharedEffectRaw.data()+at,&value,sizeof(value));};field(0x10,e.mode);field(0x11,e.alpha);field(0x12,e.red);field(0x13,e.green);field(0x14,e.blue);field(0x16,e.projection);field(0x1c,e.scale);field(0x28,e.rotation);field(0x34,e.offset);if(load)e.poseActive=sharedEffectRaw[0x40]!=0;else sharedEffectRaw[0x40]=e.poseActive;field(0x44,e.motion.x);field(0x48,e.motion.y);field(0x50,e.motion.velocityX);field(0x54,e.motion.velocityY);field(0x60,e.cursor.action);field(0x62,e.cursor.index);field(0x64,e.cursor.elapsed);field(0x66,e.motion.facing);field(0x67,e.alternateDraw);field(0x68,e.shadow);field(0x70,e.cursor.frameCount);field(0x72,e.cursor.duration);field(0x74,e.age);field(0x76,e.speedAngle);field(0x78,e.lifetime);field(0x80,e.parameters);}
API(shared_effect_load) void shared_effect_load(const u8* p,u32 seed){sharedEffect={};std::memcpy(sharedEffectRaw.data(),p,0x94);shared_effect_fields(true);sharedEffect.pattern=&effects;sharedEffect.select(sharedEffect.cursor.action,sharedEffect.cursor.index,sharedEffect.cursor.elapsed);replayStreams.random.state=seed;sharedEffectCapture.events.clear();}
API(shared_effect_advance) void shared_effect_advance(){advance_shared_effect(sharedEffect,replayStreams.random,sharedEffectCapture);}
API(shared_effect_snapshot) const u8* shared_effect_snapshot(){shared_effect_fields(false);return sharedEffectRaw.data();}
API(shared_effect_alive) u32 shared_effect_alive(){return sharedEffect.alive;}
API(shared_effect_event_count) u32 shared_effect_event_count(){return sharedEffectCapture.events.size();}
API(shared_effect_events) const i32* shared_effect_events(){return sharedEffectCapture.events.data();}

API(effect_pattern_test_copy) void effect_pattern_test_copy(u32 from,u32 to){effects.sequences.at(to)=effects.sequences.at(from);}

API(sprite_screen_draw) void sprite_screen_draw(const u8* p,const u8* frame,float cameraX,float cameraY){FighterMotion motion;motion.x=fixture_read<float>(p,0x44);motion.y=fixture_read<float>(p,0x48);motion.facing=i8(p[0x66]);SpritePose pose;pose.active=p[0x40];pose.flags=p[0x10];pose.color=(u32(p[0x11])<<24)|(u32(p[0x12])<<16)|(u32(p[0x13])<<8)|p[0x14];std::memcpy(pose.projection.data(),p+0x16,6);std::memcpy(pose.scale.data(),p+0x1c,12);std::memcpy(pose.rotation.data(),p+0x28,12);std::memcpy(pose.offset.data(),p+0x34,12);spriteDraws.clear();spriteRenderer.screen(sprite_test_frame(frame),motion,pose);}


API(sprite_shadow_draw) void sprite_shadow_draw(const u8* p,const u8* frame,float cameraX,float cameraY,const float* projection){FighterMotion motion;motion.x=fixture_read<float>(p,0x44);motion.y=fixture_read<float>(p,0x48);motion.facing=i8(p[0x66]);SpritePose pose;pose.active=p[0x40];pose.flags=p[0x10];pose.color=(u32(p[0x11])<<24)|(u32(p[0x12])<<16)|(u32(p[0x13])<<8)|p[0x14];std::memcpy(pose.projection.data(),p+0x16,6);std::memcpy(pose.scale.data(),p+0x1c,12);std::memcpy(pose.rotation.data(),p+0x28,12);std::memcpy(pose.offset.data(),p+0x34,12);ShadowStyle style;std::copy(projection,projection+3,style.projection.begin());spriteDraws.clear();spriteRenderer.shadow(sprite_test_frame(frame),motion,pose,style,cameraX,cameraY,fixture_read<float>(p,0x6c));}


static SharedEffects sharedEffectsFixture(effects,replayStreams.random);
API(shared_manager_clear) void shared_manager_clear(u32 seed){sharedEffectsFixture.clear();replayStreams.random.state=seed;}
API(shared_manager_spawn) u32 shared_manager_spawn(const u8* p){SharedEffectRequest r;r.action=fixture_read<i16>(p,0);r.x=fixture_read<float>(p,8);r.y=fixture_read<float>(p,12);r.facing=i8(p[2]);r.layer=p[3];r.alternateDraw=p[4];r.shadow=p[5];std::memcpy(r.parameters.data(),p+16,16);return sharedEffectsFixture.spawn(r)!=nullptr;}
API(shared_manager_advance) void shared_manager_advance(){sharedEffectsFixture.advance();}
API(shared_manager_size) u32 shared_manager_size(u32 layer){return sharedEffectsFixture.size(u8(layer));}
API(shared_manager_snapshot) const u8* shared_manager_snapshot(u32 layer,u32 index){sharedEffect=sharedEffectsFixture.get(u8(layer),index);sharedEffectRaw.fill(0);return shared_effect_snapshot();}

#include "../../cpp/game/BattleSimulation.hpp"
static std::array<ReimuCharacter,2> simulationCharacters;
struct SimulationCapture:BattleSimulationSignals {std::vector<i32> events;void sound(i16 n)override{events.insert(events.end(),{1,n});}void combo(u8 side,i16 hits,i16 damage,i32 scale)override{events.insert(events.end(),{2,side,hits,damage,scale});}void spell_attempt(u8 side,u8 card)override{events.insert(events.end(),{3,side,card});}void advance_stage()override{events.push_back(4);}};
static SimulationCapture simulationCapture;
static BattleSimulation simulation({&simulationCharacters[0],&simulationCharacters[1]},effects,simulationCapture);
static std::array<std::array<u8,0x1000>,2> simulationRaw;
API(simulation_load_character) void simulation_load_character(u32 side,const u8* p,u32 difficulty){reimu_character_load(p,1,0xffffff,i32(difficulty));simulationCharacters[side]=reimuCharacter;std::memcpy(simulationRaw[side].data(),p,0x1000);}
API(simulation_configure) void simulation_configure(const u8* scene,u32 mode,u32 seed,u32 difficulty){round_state_load(scene,0,0,2);simulation.rules=roundRules;simulation.mode=GameMode(mode);simulation.difficulty=u8(difficulty);simulation.replayMode=0;simulation.replay.bind(ReplayMode::Live,nullptr,seed);simulation.bodies={};simulation.contacts={};simulation.effects.clear();for(auto& objects:simulation.objects)objects.clear();simulationCapture.events.clear();simulation.story={};simulation.story.camera.x=0;simulation.story.camera.y=300;simulation.story.camera.span=0;}
API(simulation_advance) void simulation_advance(){simulation.advance(storyEventCapture);}
API(simulation_character) const u8* simulation_character(u32 side){reimuCharacter=simulationCharacters[side];actorRaw=simulationRaw[side];return reimu_character_snapshot();}
API(simulation_scene) const u8* simulation_scene(){roundRules=simulation.rules;return round_scene_snapshot();}
API(simulation_event_count) u32 simulation_event_count(){return simulationCapture.events.size();}
API(simulation_events) const i32* simulation_events(){return simulationCapture.events.data();}
API(simulation_rng) u32 simulation_rng(){return simulation.replay.random.state;}
API(simulation_object_count) u32 simulation_object_count(u32 side,u32 layer){return simulation.objects[side].size(u8(layer));}
API(simulation_object) const u8* simulation_object(u32 side,u32 layer,u32 index){reimuObject=*static_cast<ReimuObject*>(&simulation.objects[side].get(u8(layer),index));reimuObjectRaw.fill(0);object_fixture_fields(false);return reimuObjectRaw.data();}
API(simulation_effect_count) u32 simulation_effect_count(u32 layer){return simulation.effects.size(u8(layer));}
API(simulation_effect) const u8* simulation_effect(u32 layer,u32 index){sharedEffect=simulation.effects.get(u8(layer),index);sharedEffectRaw.fill(0);return shared_effect_snapshot();}

#include "../../cpp/game/BattleControls.hpp"
static BattleControls pauseControls;static BattleSystemInput pauseInput;static std::array<FighterActor,2> pauseActors;static std::array<std::array<u8,0x1000>,2> pauseActorRaw;static ReplayRound pauseReplayRound;static ReplayStreams pauseReplay;
struct PauseCapture:BattleControlSignals {std::vector<i32> events;void sound(u16 id)override{events.insert(events.end(),{1,id});}void toggle_fullscreen()override{events.push_back(2);}};
static PauseCapture pauseCapture;
API(pause_load_actor) void pause_load_actor(u32 side,const u8* p){actor_load(p,0);pauseActors[side]=actorFixture;std::memcpy(pauseActorRaw[side].data(),p,0x1000);}
API(pause_actor) const u8* pause_actor(u32 side){actorFixture=pauseActors[side];actorRaw=pauseActorRaw[side];return actor_snapshot();}
API(pause_load) void pause_load(const u8* p,const i32* globals){round_state_load(p,0,0,globals[4]);battleProgress.paused=p[0xa0]!=0;battleProgress.pauseChoice=i8(p[0x118]);battleProgress.trainingInstantRecovery=p[0x1c]!=0;pauseControls.escapeHeld=fixture_read<i32>(p,0x114);pauseControls.reduceLivesHeld=fixture_read<i32>(p,0x110);pauseControls.trainingKeyHeld=globals[5];pauseControls.replayIntervalMs=globals[6];pauseControls.recordingFastForward=globals[7]!=0;battleSession={};battleSession.mode=GameMode(globals[0]);battleSession.replayMode=u8(globals[1]);battleSession.continueCredits=i8(globals[2]);battleSession.continued=globals[3]!=0;battleSession.replayDisposition=i8(globals[8]);pauseCapture.events.clear();}
API(pause_input) void pause_input(const u8* keys,const i32* counts){std::copy(keys,keys+256,pauseInput.keys.begin());for(u32 side=0;side<2;side++){auto& a=pauseInput.players[side];const auto* p=counts+side*7;a.horizontal=p[0];a.vertical=p[1];std::copy(p+2,p+6,a.buttons.begin());pauseInput.cancel[side]=p[6];}}
API(pause_replay_load) void pause_replay_load(const u32* events,u32 n){pauseReplayRound={};pauseReplayRound.events.assign(events,events+n);pauseReplay.bind(battleSession.replayMode==2?ReplayMode::Playback:battleSession.replayMode==1?ReplayMode::Recording:ReplayMode::Live,&pauseReplayRound,1);}
API(pause_apply) void pause_apply(u32 operation,u32 frame){if(operation==0)pauseControls.poll_pause(pauseInput,battleProgress,battleSession.mode,pauseCapture);else if(operation==1)pauseControls.pause_menu(pauseInput,pauseActors[0],pauseActors[1],battleProgress,battleSession,pauseCapture);else pauseControls.frame_events(pauseInput,pauseActors[0],pauseActors[1],battleProgress,battleSession,pauseReplay,frame);}
API(pause_scene) const u8* pause_scene(){round_scene_snapshot();roundSceneBytes[0xa0]=battleProgress.paused;roundSceneBytes[0x118]=u8(battleProgress.pauseChoice);roundSceneBytes[0x1c]=battleProgress.trainingInstantRecovery;std::memcpy(roundSceneBytes.data()+0x110,&pauseControls.reduceLivesHeld,4);std::memcpy(roundSceneBytes.data()+0x114,&pauseControls.escapeHeld,4);return roundSceneBytes.data();}
API(pause_globals) const i32* pause_globals(){static std::array<i32,9> p;p={i32(battleSession.mode),battleSession.replayMode,battleSession.continueCredits,i32(battleSession.continued),roundRules.remainingLives,pauseControls.trainingKeyHeld,pauseControls.replayIntervalMs,i32(pauseControls.recordingFastForward),battleSession.replayDisposition};return p.data();}
API(pause_events) const i32* pause_events(){return pauseCapture.events.data();}
API(pause_event_count) u32 pause_event_count(){return pauseCapture.events.size();}
API(pause_replay_words) const u32* pause_replay_words(){return pauseReplayRound.events.data()+pauseReplay.eventCursor;}
API(pause_replay_count) u32 pause_replay_count(){return pauseReplayRound.events.size()-pauseReplay.eventCursor;}

#include "../../cpp/game/BattleFrame.hpp"
static BattleFrameState frameState;static std::array<RoundFighterState,2> frameActors;
struct FrameCapture:BattleFrameCallbacks {std::vector<i32> events;i32 poll=-1,menu=-1;BattleExit exit=BattleExit::Stay;void poll_pause()override{events.push_back(1);if(poll>=0)battleProgress.paused=poll!=0;}void render()override{events.push_back(2);}void update_inputs()override{events.push_back(3);}void frame_events()override{events.push_back(4);}void simulate()override{events.push_back(5);}void pause_menu()override{events.push_back(6);if(menu>=0)battleProgress.paused=menu!=0;}void present()override{events.push_back(7);}BattleExit advance_state()override{events.push_back(8);return exit;}};
static FrameCapture frameCapture;
API(frame_load) void frame_load(const u8* p,const i32* settings,const i32* raw){round_state_load(p,0,0,2);battleProgress.paused=p[0xa0]!=0;battleProgress.pauseFade=p[0xa1];std::memcpy(battleProgress.savedInputs.data(),p+0xa4,56);frameState.frame=fixture_read<u32>(p,0x10);frameState.replayFrame=fixture_read<u32>(p,0x14);frameState.replayMode=u8(settings[0]);frameState.draw=settings[1]!=0;frameState.renderEveryFrame=settings[2]!=0;frameCapture.poll=settings[3];frameCapture.menu=settings[4];frameCapture.exit=BattleExit(settings[5]);frameCapture.events.clear();for(u32 side=0;side<2;side++)std::copy(raw+side*7,raw+side*7+7,frameActors[side].rawInputs.begin());}
API(frame_advance) u32 frame_advance(){return u32(advance_battle_frame(frameState,battleProgress,{&frameActors[0],&frameActors[1]},frameCapture));}
API(frame_scene) const u8* frame_scene(){round_scene_snapshot();std::memcpy(roundSceneBytes.data()+0x10,&frameState.frame,4);std::memcpy(roundSceneBytes.data()+0x14,&frameState.replayFrame,4);roundSceneBytes[0xa0]=battleProgress.paused;roundSceneBytes[0xa1]=battleProgress.pauseFade;return roundSceneBytes.data();}
API(frame_inputs) const i32* frame_inputs(u32 side){return frameActors[side].rawInputs.data();}
API(frame_draw) u32 frame_draw(){return frameState.draw;}
API(frame_events) const i32* frame_events(){return frameCapture.events.data();}
API(frame_event_count) u32 frame_event_count(){return frameCapture.events.size();}

#include "../../cpp/game/MarisaState.hpp"
#include "../../cpp/game/MarisaCharacter.hpp"
static MarisaCharacter marisaCharacter;
static MarisaState marisaState;static CharacterAIContext marisaAIContext;static std::array<u8,0x1a00> marisaRaw;
static void marisa_fixture_fields(bool load){auto& s=marisaState;
    const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,marisaRaw.data()+at,sizeof(v));else std::memcpy(marisaRaw.data()+at,&v,sizeof(v));};
    field(0xf00,s.actionTicks);field(0xf02,s.actionStage);field(0xf04,s.volleyIndex);field(0xf06,s.recoveryCounters);field(0xf0a,s.frame.blockEffectSent);field(0xf0c,s.effectCounters);
    field(0xf12,s.chargeMode);field(0xf14,s.chargeCount);field(0xf16,s.chargeRemaining);field(0xf18,s.spellCounters);field(0xf32,s.frame.farRangeFrames);field(0xefc,s.introWait);field(0xefe,s.captionWait);
    if(load)s.laser.visible=marisaRaw[0x1006]!=0;else marisaRaw[0x1006]=s.laser.visible;
    field(0x1008,s.laser.x);field(0x100c,s.laser.y);field(0x1010,s.laser.width);field(0x1014,s.laser.facing);field(0x1018,s.laser.vertices);
}
API(marisa_load) void marisa_load(const u8* p,u32 size,i32 difficulty){actor_load(p,0);marisaRaw.fill(0);std::memcpy(marisaRaw.data(),p,std::min(size,u32(marisaRaw.size())));marisa_fixture_fields(true);marisaState.difficulty=i8(difficulty);recoveryCapture.events.clear();}
API(marisa_snapshot) const u8* marisa_snapshot(){actor_snapshot();std::memcpy(marisaRaw.data(),actorRaw.data(),actorRaw.size());marisa_fixture_fields(false);return marisaRaw.data();}
API(marisa_input_command) u32 marisa_input_command(const u8* p,i32 facing){InputHistory history;std::memcpy(history.frames.data(),p,90);return recognize_marisa_command(history,i8(facing));}
API(marisa_frame_advance) void marisa_frame_advance(const u8* p){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);advance_marisa_frame(actorFixture,other,marisaState.frame,recoveryCapture);}
API(marisa_commands) void marisa_commands(const u8* p){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);select_marisa_commands(actorFixture,other,marisaState);}
API(marisa_reset) void marisa_reset(){marisaCharacter.actor=actorFixture;marisaCharacter.state=marisaState;marisaCharacter.reset(actorCoreEvents);actorFixture=marisaCharacter.actor;marisaState=marisaCharacter.state;}
API(marisa_ai_load) void marisa_ai_load(i32 duel,i32 story){marisaAIContext={duel,story};}
API(marisa_ai_advance) void marisa_ai_advance(const u8* p,u32 story){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);other.motion.y=fixture_read<float>(p,0x48);other.animation.cursor.action=fixture_read<i16>(p,0x60);if(story)choose_marisa_story_input(actorFixture,other,marisaState,replayStreams.random,marisaAIContext);else choose_marisa_duel_input(actorFixture,other,marisaState,replayStreams.random,marisaAIContext);}
API(marisa_ai_walk) i32 marisa_ai_walk(u32 story){return story?marisaAIContext.storyWalkFrames:marisaAIContext.duelWalkFrames;}

static FighterActor marisaOther;static std::array<u8,0x1000> marisaOtherRaw;
API(marisa_action_advance) void marisa_action_advance(const u8* p,u32 mode){
    const auto save=actorFixture;const auto raw=actorRaw;actor_load(p,0);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;
    marisaCharacter.actor=actorFixture;marisaCharacter.state=marisaState;marisaCharacter.advance_action(marisaOther,GameMode(mode),replayStreams,0,actorCoreEvents,recoveryCapture);actorFixture=marisaCharacter.actor;marisaState=marisaCharacter.state;
}
API(marisa_action_other) const u8* marisa_action_other(){const auto save=actorFixture;const auto raw=actorRaw;actorFixture=marisaOther;actorRaw=marisaOtherRaw;actor_snapshot();marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;return marisaOtherRaw.data();}

#include "../../cpp/game/MarisaObjects.hpp"
static MarisaObject marisaObject;static std::array<u8,0xe8> marisaObjectRaw;
static void marisa_object_fixture_fields(bool load){
    auto& a=marisaObject;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,marisaObjectRaw.data()+at,sizeof(v));else std::memcpy(marisaObjectRaw.data()+at,&v,sizeof(v));};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(marisaObjectRaw[0x11])<<24)|(u32(marisaObjectRaw[0x12])<<16)|(u32(marisaObjectRaw[0x13])<<8)|marisaObjectRaw[0x14];else for(u32 i=0;i<4;i++)marisaObjectRaw[0x11+i]=u8(a.pose.color>>(24-i*8));
    field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);if(load)a.pose.active=marisaObjectRaw[0x40]!=0;else marisaObjectRaw[0x40]=a.pose.active;
    field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x67,a.order);field(0x68,a.group);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.hits);field(0x82,a.freeze);field(0x84,a.recoveryTimers);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.sourcePower);field(0xa4,a.sourceModifier);
    field(0xc8,a.parameters);field(0xd8,a.counter);field(0xda,a.timer);field(0xdc,a.angle);field(0xde,a.cycle);field(0xe0,a.variant);field(0xe2,a.auxiliary);
}

API(marisa_object_load) void marisa_object_load(const u8* p,const u8* owner,i32 difficulty){marisa_load(owner,0x1a00,difficulty);marisaObject={};std::memcpy(marisaObjectRaw.data(),p,marisaObjectRaw.size());marisa_object_fixture_fields(true);marisaObject.animation.pattern=&patterns;marisaObject.animation.set(marisaObject.animation.cursor.action,marisaObject.animation.cursor.index,marisaObject.animation.cursor.elapsed);marisaObject.alive=true;}
API(marisa_object_advance) void marisa_object_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_marisa_object(marisaObject,actorFixture,marisaOther,marisaState,replayStreams,recoveryCapture);}
API(marisa_object_snapshot) const u8* marisa_object_snapshot(){marisa_object_fixture_fields(false);return marisaObjectRaw.data();}
API(marisa_object_alive) u32 marisa_object_alive(){return marisaObject.alive;}
API(marisa_trails_configure) void marisa_trails_configure(i32 interval,u32 mask){actorFixture.trails.interval=i8(interval);actorFixture.trails.maximum=32;actorFixture.trails.colorMask=mask;}
API(marisa_trails_state) const u32* marisa_trails_state(){static std::array<u32,3> values;values={u32(i32(actorFixture.trails.interval)),u32(i32(actorFixture.trails.maximum)),actorFixture.trails.colorMask};return values.data();}

#include "../../cpp/game/MarisaStory.hpp"
static std::array<u8,0x1a00> marisaStoryOtherRaw;
static void marisa_story_fields(bool load){auto& s=marisaState.story;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,marisaRaw.data()+at,sizeof(v));else std::memcpy(marisaRaw.data()+at,&v,sizeof(v));};field(0x6e4,s.step);field(0x6e5,s.opponent);field(0x713,s.nextStage);for(u32 i=0;i<4;i++){field(0xf34+i*4,s.x[i]);field(0xf5c+i*4,s.y[i]);field(0xffc+i,s.alpha[i]);}}
API(marisa_story_load) void marisa_story_load(const u8* other,const u8* settings,u32 mask){const auto save=actorFixture;const auto raw=actorRaw;actor_load(other,0);storyOther=actorFixture;std::memcpy(marisaStoryOtherRaw.data(),other,marisaStoryOtherRaw.size());actorFixture=save;actorRaw=raw;marisa_story_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);storyEnvironment.completedStages=settings[8];storyEnvironment.route=settings[9];storyEventCapture.events.clear();storyEventCapture.player=&actorFixture;storyEventCapture.dialogueMask=mask;storyEventCapture.calls=0;}
API(marisa_story_setup) void marisa_story_setup(const u8* other,const u8* settings){marisa_story_load(other,settings,0);initialize_marisa_story(actorFixture,storyOther,marisaState.story,storyEnvironment);}
API(marisa_story_advance) void marisa_story_advance(){advance_marisa_story(actorFixture,storyOther,marisaState.story,marisaState.introWait,storyEnvironment,storyEventCapture);}
API(marisa_story_snapshot) const u8* marisa_story_snapshot(){marisa_snapshot();marisa_story_fields(false);return marisaRaw.data();}
API(marisa_story_other) const u8* marisa_story_other(){const auto save=actorFixture;const auto raw=actorRaw;actorFixture=storyOther;std::memcpy(actorRaw.data(),marisaStoryOtherRaw.data(),actorRaw.size());actor_snapshot();std::memcpy(marisaStoryOtherRaw.data(),actorRaw.data(),actorRaw.size());actorFixture=save;actorRaw=raw;return marisaStoryOtherRaw.data();}
API(marisa_story_draw) u32 marisa_story_draw(u32 stage,u32 filter){marisa_story_fields(true);storyGraphics.filter(Filter(filter));storyDraws.clear();marisaState.story.render(u8(stage),actorFixture,marisaState.captionWait,storyGraphics,{0,1,2,3});return storyDraws.size();}
#include "../../cpp/game/MarisaRender.hpp"
struct LaserCapture:CaptureGraphics {std::vector<ScreenVertex> vertices;void draw(u32,Topology,const ScreenVertex* v,u32 count)override{vertices.insert(vertices.end(),v,v+count);}};
static LaserCapture laserCapture;static ZunGraphics laserGraphics(laserCapture);
API(marisa_laser_draw) u32 marisa_laser_draw(float x,float y,float scale,float originX,float originY,float multiplier){CameraMotion camera;camera.x=x;camera.y=y;laserCapture.vertices.clear();laserGraphics.drawScale=scale;laserGraphics.originX=originX;laserGraphics.originY=originY;laserGraphics.colorMultiplier=multiplier;render_marisa_laser(actorFixture,marisaState.laser,camera,laserGraphics,0x277);return laserCapture.vertices.size();}
API(marisa_laser_data) const ScreenVertex* marisa_laser_data(){return laserCapture.vertices.data();}

#include "../../cpp/game/SakuyaCharacter.hpp"
static SakuyaCharacter sakuyaCharacter;
static SakuyaState sakuyaState;static CharacterAIContext sakuyaAIContext;static std::array<u8,0x1a00> sakuyaRaw;
static void sakuya_fixture_fields(bool load){auto& s=sakuyaState;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,sakuyaRaw.data()+at,sizeof(v));else std::memcpy(sakuyaRaw.data()+at,&v,sizeof(v));};field(0xf00,s.actionTicks);field(0xf02,s.actionStage);field(0xf04,s.emissionDelay);field(0xf06,s.volleyLoops);field(0xf08,s.burstCount);field(0xf0a,s.blockEffectSent);field(0xf0c,s.clockReserve);field(0xf0e,s.clockPulse);field(0xf10,s.timeReserve);field(0xf12,s.timeActive);field(0xf14,s.knivesActive);field(0xf16,s.farRangeFrames);field(0xefc,s.introWait);field(0xefe,s.captionWait);}
API(sakuya_load) void sakuya_load(const u8* p,u32 size,i32 difficulty){actor_load(p,0);sakuyaRaw.fill(0);std::memcpy(sakuyaRaw.data(),p,std::min(size,u32(sakuyaRaw.size())));sakuya_fixture_fields(true);sakuyaState.difficulty=i8(difficulty);recoveryCapture.events.clear();}
API(sakuya_snapshot) const u8* sakuya_snapshot(){actor_snapshot();std::memcpy(sakuyaRaw.data(),actorRaw.data(),actorRaw.size());sakuya_fixture_fields(false);return sakuyaRaw.data();}
API(sakuya_input_command) u32 sakuya_input_command(const u8* p,i32 facing){InputHistory history;std::memcpy(history.frames.data(),p,90);return recognize_sakuya_command(history,i8(facing));}
API(sakuya_reset) void sakuya_reset(){sakuyaCharacter.actor=actorFixture;sakuyaCharacter.state=sakuyaState;sakuyaCharacter.reset(actorCoreEvents);actorFixture=sakuyaCharacter.actor;sakuyaState=sakuyaCharacter.state;}
API(sakuya_commands) void sakuya_commands(const u8* p){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);select_sakuya_commands(actorFixture,other,sakuyaState);}
API(sakuya_ai_load) void sakuya_ai_load(i32 duel,i32 story){sakuyaAIContext={duel,story};}
API(sakuya_ai_advance) void sakuya_ai_advance(const u8* p,u32 story){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);other.motion.y=fixture_read<float>(p,0x48);other.animation.cursor.action=fixture_read<i16>(p,0x60);if(story)choose_sakuya_story_input(actorFixture,other,sakuyaState,replayStreams.random,sakuyaAIContext);else choose_sakuya_duel_input(actorFixture,other,sakuyaState,replayStreams.random,sakuyaAIContext);}
API(sakuya_ai_walk) i32 sakuya_ai_walk(u32 story){return story?sakuyaAIContext.storyWalkFrames:sakuyaAIContext.duelWalkFrames;}
API(sakuya_frame_advance) void sakuya_frame_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_sakuya_frame(actorFixture,marisaOther,sakuyaState,recoveryCapture);}
API(sakuya_frame_other) const u8* sakuya_frame_other(){return marisa_action_other();}

API(sakuya_action_advance) void sakuya_action_advance(const u8* p,u32 mode){const auto save=actorFixture;const auto raw=actorRaw;actor_load(p,0);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;sakuyaCharacter.actor=actorFixture;sakuyaCharacter.state=sakuyaState;sakuyaCharacter.advance_action(marisaOther,GameMode(mode),replayStreams,0,actorCoreEvents,recoveryCapture);actorFixture=sakuyaCharacter.actor;sakuyaState=sakuyaCharacter.state;}
API(sakuya_action_other) const u8* sakuya_action_other(){return marisa_action_other();}
API(sakuya_trails_configure) void sakuya_trails_configure(i32 interval,u32 mask){marisa_trails_configure(interval,mask);}
API(sakuya_trails_state) const u32* sakuya_trails_state(){return marisa_trails_state();}
#include "../../cpp/game/SakuyaObjects.hpp"
static SakuyaObject sakuyaObject;static std::array<u8,0xe8> sakuyaObjectRaw;
static void sakuya_object_fixture_fields(bool load){
    auto& a=sakuyaObject;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,sakuyaObjectRaw.data()+at,sizeof(v));else std::memcpy(sakuyaObjectRaw.data()+at,&v,sizeof(v));};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(sakuyaObjectRaw[0x11])<<24)|(u32(sakuyaObjectRaw[0x12])<<16)|(u32(sakuyaObjectRaw[0x13])<<8)|sakuyaObjectRaw[0x14];else for(u32 i=0;i<4;i++)sakuyaObjectRaw[0x11+i]=u8(a.pose.color>>(24-i*8));
    field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);if(load)a.pose.active=sakuyaObjectRaw[0x40]!=0;else sakuyaObjectRaw[0x40]=a.pose.active;
    field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x67,a.order);field(0x68,a.group);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.hits);field(0x82,a.freeze);field(0x84,a.recoveryTimers);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.sourcePower);field(0xa4,a.sourceModifier);
    field(0xc8,a.parameters);field(0xd8,a.counter);field(0xda,a.timer);field(0xdc,a.angle);field(0xde,a.cycle);field(0xe0,a.variant);field(0xe2,a.auxiliary);
}

API(sakuya_object_load) void sakuya_object_load(const u8* p,const u8* owner,i32 difficulty){sakuya_load(owner,0x1a00,difficulty);sakuyaObject={};std::memcpy(sakuyaObjectRaw.data(),p,sakuyaObjectRaw.size());sakuya_object_fixture_fields(true);sakuyaObject.animation.pattern=&patterns;sakuyaObject.animation.set(sakuyaObject.animation.cursor.action,sakuyaObject.animation.cursor.index,sakuyaObject.animation.cursor.elapsed);sakuyaObject.alive=true;}
API(sakuya_object_advance) void sakuya_object_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_sakuya_object(sakuyaObject,actorFixture,marisaOther,sakuyaState,replayStreams,recoveryCapture);}
API(sakuya_object_snapshot) const u8* sakuya_object_snapshot(){sakuya_object_fixture_fields(false);return sakuyaObjectRaw.data();}
API(sakuya_object_alive) u32 sakuya_object_alive(){return sakuyaObject.alive;}

#include "../../cpp/game/SakuyaStory.hpp"
static std::array<u8,0x1a00> sakuyaStoryOtherRaw;
static void sakuya_story_fields(bool load){auto& s=sakuyaState.story;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,sakuyaRaw.data()+at,sizeof(v));else std::memcpy(sakuyaRaw.data()+at,&v,sizeof(v));};field(0x6e4,s.step);field(0x6e5,s.opponent);field(0x713,s.nextStage);for(u32 i=0;i<4;i++){field(0xf18+i*4,s.x[i]);field(0xf40+i*4,s.y[i]);field(0xfe0+i,s.alpha[i]);}}
API(sakuya_story_load) void sakuya_story_load(const u8* other,const u8* settings,u32 mask){const auto save=actorFixture;const auto raw=actorRaw;actor_load(other,0);storyOther=actorFixture;std::memcpy(sakuyaStoryOtherRaw.data(),other,sakuyaStoryOtherRaw.size());actorFixture=save;actorRaw=raw;sakuya_story_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);storyEnvironment.completedStages=settings[8];storyEnvironment.route=settings[9];storyEventCapture.events.clear();storyEventCapture.player=&actorFixture;storyEventCapture.dialogueMask=mask;storyEventCapture.calls=0;}
API(sakuya_story_setup) void sakuya_story_setup(const u8* other,const u8* settings){sakuya_story_load(other,settings,0);initialize_sakuya_story(actorFixture,storyOther,sakuyaState.story,storyEnvironment);}
API(sakuya_story_advance) void sakuya_story_advance(){advance_sakuya_story(actorFixture,storyOther,sakuyaState.story,sakuyaState.introWait,storyEnvironment,storyEventCapture);}
API(sakuya_story_snapshot) const u8* sakuya_story_snapshot(){sakuya_snapshot();sakuya_story_fields(false);return sakuyaRaw.data();}
API(sakuya_story_other) const u8* sakuya_story_other(){const auto save=actorFixture;const auto raw=actorRaw;actorFixture=storyOther;std::memcpy(actorRaw.data(),sakuyaStoryOtherRaw.data(),actorRaw.size());actor_snapshot();std::memcpy(sakuyaStoryOtherRaw.data(),actorRaw.data(),actorRaw.size());actorFixture=save;actorRaw=raw;return sakuyaStoryOtherRaw.data();}
API(sakuya_story_draw) u32 sakuya_story_draw(u32 stage,u32 filter){sakuya_story_fields(true);storyGraphics.filter(Filter(filter));storyDraws.clear();sakuyaState.story.render(u8(stage),actorFixture,sakuyaState.captionWait,storyGraphics,{0,1,2,3});return storyDraws.size();}

#include "../../cpp/game/AliceCharacter.hpp"
static AliceCharacter aliceCharacter;
static AliceState aliceState;static CharacterAIContext aliceAIContext;static std::array<u8,0x1a00> aliceRaw;
static void alice_fixture_fields(bool load){auto& s=aliceState;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,aliceRaw.data()+at,sizeof(v));else std::memcpy(aliceRaw.data()+at,&v,sizeof(v));};field(0xf00,s.actionTicks);field(0xf02,s.actionStage);field(0xf04,s.volleyTicks);field(0xf06,s.volleyCount);field(0xf08,s.knockbackX);field(0xf0a,s.knockbackY);field(0xf0c,s.dollCenterX);field(0xf0e,s.dollCenterY);field(0xf10,s.dollRadius);field(0xf12,s.dollPhase);field(0xf14,s.farRangeFrames);field(0xefc,s.introWait);field(0xefe,s.captionWait);}
API(alice_load) void alice_load(const u8* p,u32 size,i32 difficulty){actor_load(p,0);aliceRaw.fill(0);std::memcpy(aliceRaw.data(),p,std::min(size,u32(aliceRaw.size())));alice_fixture_fields(true);aliceState.difficulty=i8(difficulty);recoveryCapture.events.clear();}
API(alice_snapshot) const u8* alice_snapshot(){actor_snapshot();std::memcpy(aliceRaw.data(),actorRaw.data(),actorRaw.size());alice_fixture_fields(false);return aliceRaw.data();}
API(alice_input_command) u32 alice_input_command(const u8* p,i32 facing){InputHistory history;std::memcpy(history.frames.data(),p,90);return recognize_alice_command(history,i8(facing));}
API(alice_reset) void alice_reset(){aliceCharacter.actor=actorFixture;aliceCharacter.state=aliceState;aliceCharacter.reset(actorCoreEvents);actorFixture=aliceCharacter.actor;aliceState=aliceCharacter.state;}
API(alice_commands) void alice_commands(const u8* p){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);select_alice_commands(actorFixture,other,aliceState);}
API(alice_ai_load) void alice_ai_load(i32 duel,i32 story){aliceAIContext={duel,story};}
API(alice_ai_advance) void alice_ai_advance(const u8* p,u32 story){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);other.motion.y=fixture_read<float>(p,0x48);other.animation.cursor.action=fixture_read<i16>(p,0x60);if(story)choose_alice_story_input(actorFixture,other,aliceState,replayStreams.random,aliceAIContext);else choose_alice_duel_input(actorFixture,other,aliceState,replayStreams.random,aliceAIContext);}
API(alice_ai_walk) i32 alice_ai_walk(u32 story){return story?aliceAIContext.storyWalkFrames:aliceAIContext.duelWalkFrames;}
API(alice_frame_advance) void alice_frame_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_alice_frame(actorFixture,marisaOther,aliceState,recoveryCapture);}
API(alice_frame_other) const u8* alice_frame_other(){return marisa_action_other();}

API(alice_action_advance) void alice_action_advance(const u8* p,u32 mode){const auto save=actorFixture;const auto raw=actorRaw;actor_load(p,0);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;aliceCharacter.actor=actorFixture;aliceCharacter.state=aliceState;aliceCharacter.advance_action(marisaOther,GameMode(mode),replayStreams,0,actorCoreEvents,recoveryCapture);actorFixture=aliceCharacter.actor;aliceState=aliceCharacter.state;}
API(alice_action_other) const u8* alice_action_other(){return marisa_action_other();}
API(alice_trails_configure) void alice_trails_configure(i32 interval,u32 mask){marisa_trails_configure(interval,mask);}
API(alice_trails_state) const u32* alice_trails_state(){return marisa_trails_state();}

#include "../../cpp/game/AliceObjects.hpp"
static AliceObject aliceObject;static std::array<u8,0xe8> aliceObjectRaw;
static void alice_object_fixture_fields(bool load){
    auto& a=aliceObject;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,aliceObjectRaw.data()+at,sizeof(v));else std::memcpy(aliceObjectRaw.data()+at,&v,sizeof(v));};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(aliceObjectRaw[0x11])<<24)|(u32(aliceObjectRaw[0x12])<<16)|(u32(aliceObjectRaw[0x13])<<8)|aliceObjectRaw[0x14];else for(u32 i=0;i<4;i++)aliceObjectRaw[0x11+i]=u8(a.pose.color>>(24-i*8));
    field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);if(load)a.pose.active=aliceObjectRaw[0x40]!=0;else aliceObjectRaw[0x40]=a.pose.active;
    field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x67,a.order);field(0x68,a.group);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.hits);field(0x82,a.freeze);field(0x84,a.recoveryTimers);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.sourcePower);field(0xa4,a.sourceModifier);
    field(0xc8,a.parameters);field(0xd8,a.counter);field(0xda,a.timer);field(0xdc,a.angle);field(0xde,a.cycle);field(0xe0,a.variant);field(0xe2,a.auxiliary);
}

API(alice_object_load) void alice_object_load(const u8* p,const u8* owner,i32 difficulty){alice_load(owner,0x1a00,difficulty);aliceObject={};std::memcpy(aliceObjectRaw.data(),p,aliceObjectRaw.size());alice_object_fixture_fields(true);aliceObject.animation.pattern=&patterns;aliceObject.animation.set(aliceObject.animation.cursor.action,aliceObject.animation.cursor.index,aliceObject.animation.cursor.elapsed);aliceObject.alive=true;}
API(alice_object_advance) void alice_object_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_alice_object(aliceObject,actorFixture,marisaOther,aliceState,replayStreams,recoveryCapture);}
API(alice_object_snapshot) const u8* alice_object_snapshot(){alice_object_fixture_fields(false);return aliceObjectRaw.data();}
API(alice_object_alive) u32 alice_object_alive(){return aliceObject.alive;}


#include "../../cpp/game/AliceStory.hpp"
static std::array<u8,0x1a00> aliceStoryOtherRaw;
static void alice_story_fields(bool load){auto& s=aliceState.story;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,aliceRaw.data()+at,sizeof(v));else std::memcpy(aliceRaw.data()+at,&v,sizeof(v));};field(0x6e4,s.step);field(0x6e5,s.opponent);field(0x713,s.nextStage);for(u32 i=0;i<4;i++){field(0xf18+i*4,s.x[i]);field(0xf40+i*4,s.y[i]);field(0xfe0+i,s.alpha[i]);}}
API(alice_story_load) void alice_story_load(const u8* other,const u8* settings,u32 mask){const auto save=actorFixture;const auto raw=actorRaw;actor_load(other,0);storyOther=actorFixture;std::memcpy(aliceStoryOtherRaw.data(),other,aliceStoryOtherRaw.size());actorFixture=save;actorRaw=raw;alice_story_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);storyEnvironment.completedStages=settings[8];storyEnvironment.route=settings[9];storyEventCapture.events.clear();storyEventCapture.player=&actorFixture;storyEventCapture.dialogueMask=mask;storyEventCapture.calls=0;}
API(alice_story_setup) void alice_story_setup(const u8* other,const u8* settings){alice_story_load(other,settings,0);initialize_alice_story(actorFixture,storyOther,aliceState.story,storyEnvironment);}
API(alice_story_advance) void alice_story_advance(){advance_alice_story(actorFixture,storyOther,aliceState.story,aliceState.introWait,storyEnvironment,storyEventCapture);}
API(alice_story_snapshot) const u8* alice_story_snapshot(){alice_snapshot();alice_story_fields(false);return aliceRaw.data();}
API(alice_story_other) const u8* alice_story_other(){const auto save=actorFixture;const auto raw=actorRaw;actorFixture=storyOther;std::memcpy(actorRaw.data(),aliceStoryOtherRaw.data(),actorRaw.size());actor_snapshot();std::memcpy(aliceStoryOtherRaw.data(),actorRaw.data(),actorRaw.size());actorFixture=save;actorRaw=raw;return aliceStoryOtherRaw.data();}
API(alice_story_draw) u32 alice_story_draw(u32 stage,u32 filter){alice_story_fields(true);storyGraphics.filter(Filter(filter));storyDraws.clear();aliceState.story.render(u8(stage),actorFixture,aliceState.captionWait,storyGraphics,{0,1,2,3});return storyDraws.size();}


#include "../../cpp/game/PatchouliCharacter.hpp"
static PatchouliCharacter patchouliCharacter;
static PatchouliState patchouliState;static CharacterAIContext patchouliAIContext;static std::array<u8,0x1a00> patchouliRaw;
static void patchouli_fixture_fields(bool load){auto& s=patchouliState;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,patchouliRaw.data()+at,sizeof(v));else std::memcpy(patchouliRaw.data()+at,&v,sizeof(v));};field(0xf00,s.actionTicks);field(0xf02,s.actionStage);field(0xf04,s.emissionIndex);field(0xf06,s.emissionDelay);field(0xf08,s.effectLoops);field(0xf0a,s.blockEffectSent);field(0xf0c,s.orbitAngle);field(0xf0e,s.spinAngle);field(0xf10,s.windForceTime);field(0xf12,s.farRangeFrames);field(0xefc,s.introWait);field(0xefe,s.captionWait);}
API(patchouli_load) void patchouli_load(const u8* p,u32 size,i32 difficulty){actor_load(p,0);patchouliRaw.fill(0);std::memcpy(patchouliRaw.data(),p,std::min(size,u32(patchouliRaw.size())));patchouli_fixture_fields(true);patchouliState.difficulty=i8(difficulty);recoveryCapture.events.clear();}
API(patchouli_snapshot) const u8* patchouli_snapshot(){actor_snapshot();std::memcpy(patchouliRaw.data(),actorRaw.data(),actorRaw.size());patchouli_fixture_fields(false);return patchouliRaw.data();}
API(patchouli_input_command) u32 patchouli_input_command(const u8* p,i32 facing){InputHistory history;std::memcpy(history.frames.data(),p,90);return recognize_patchouli_command(history,i8(facing));}
API(patchouli_reset) void patchouli_reset(){patchouliCharacter.actor=actorFixture;patchouliCharacter.state=patchouliState;patchouliCharacter.reset(actorCoreEvents);actorFixture=patchouliCharacter.actor;patchouliState=patchouliCharacter.state;}
API(patchouli_commands) void patchouli_commands(const u8* p){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);select_patchouli_commands(actorFixture,other,patchouliState);}
API(patchouli_ai_load) void patchouli_ai_load(i32 duel,i32 story){patchouliAIContext={duel,story};}
API(patchouli_ai_advance) void patchouli_ai_advance(const u8* p,u32 story){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);other.motion.y=fixture_read<float>(p,0x48);other.animation.cursor.action=fixture_read<i16>(p,0x60);if(story)choose_patchouli_story_input(actorFixture,other,patchouliState,replayStreams.random,patchouliAIContext);else choose_patchouli_duel_input(actorFixture,other,patchouliState,replayStreams.random,patchouliAIContext);}
API(patchouli_ai_walk) i32 patchouli_ai_walk(u32 story){return story?patchouliAIContext.storyWalkFrames:patchouliAIContext.duelWalkFrames;}
API(patchouli_frame_advance) void patchouli_frame_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_patchouli_frame(actorFixture,marisaOther,patchouliState,replayStreams,recoveryCapture);}
API(patchouli_frame_other) const u8* patchouli_frame_other(){return marisa_action_other();}

API(patchouli_action_advance) void patchouli_action_advance(const u8* p,u32 mode){const auto save=actorFixture;const auto raw=actorRaw;actor_load(p,0);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;patchouliCharacter.actor=actorFixture;patchouliCharacter.state=patchouliState;patchouliCharacter.advance_action(marisaOther,GameMode(mode),replayStreams,0,actorCoreEvents,recoveryCapture);actorFixture=patchouliCharacter.actor;patchouliState=patchouliCharacter.state;}
API(patchouli_action_other) const u8* patchouli_action_other(){return marisa_action_other();}
API(patchouli_trails_configure) void patchouli_trails_configure(i32 interval,u32 mask){marisa_trails_configure(interval,mask);}
API(patchouli_trails_state) const u32* patchouli_trails_state(){return marisa_trails_state();}


#include "../../cpp/game/PatchouliObjects.hpp"
static PatchouliObject patchouliObject;static std::array<u8,0xe8> patchouliObjectRaw;
static void patchouli_object_fixture_fields(bool load){
    auto& a=patchouliObject;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,patchouliObjectRaw.data()+at,sizeof(v));else std::memcpy(patchouliObjectRaw.data()+at,&v,sizeof(v));};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(patchouliObjectRaw[0x11])<<24)|(u32(patchouliObjectRaw[0x12])<<16)|(u32(patchouliObjectRaw[0x13])<<8)|patchouliObjectRaw[0x14];else for(u32 i=0;i<4;i++)patchouliObjectRaw[0x11+i]=u8(a.pose.color>>(24-i*8));
    field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);if(load)a.pose.active=patchouliObjectRaw[0x40]!=0;else patchouliObjectRaw[0x40]=a.pose.active;
    field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x67,a.order);field(0x68,a.group);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.hits);field(0x82,a.freeze);field(0x84,a.recoveryTimers);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.sourcePower);field(0xa4,a.sourceModifier);
    field(0xc8,a.parameters);field(0xd8,a.counter);field(0xda,a.timer);field(0xdc,a.angle);field(0xde,a.cycle);field(0xe0,a.variant);field(0xe2,a.auxiliary);
}

API(patchouli_object_load) void patchouli_object_load(const u8* p,const u8* owner,i32 difficulty){patchouli_load(owner,0x1a00,difficulty);patchouliObject={};std::memcpy(patchouliObjectRaw.data(),p,patchouliObjectRaw.size());patchouli_object_fixture_fields(true);patchouliObject.animation.pattern=&patterns;patchouliObject.animation.set(patchouliObject.animation.cursor.action,patchouliObject.animation.cursor.index,patchouliObject.animation.cursor.elapsed);patchouliObject.alive=true;}
API(patchouli_object_advance) void patchouli_object_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_patchouli_object(patchouliObject,actorFixture,marisaOther,patchouliState,replayStreams,recoveryCapture);}
API(patchouli_object_snapshot) const u8* patchouli_object_snapshot(){patchouli_object_fixture_fields(false);return patchouliObjectRaw.data();}
API(patchouli_object_alive) u32 patchouli_object_alive(){return patchouliObject.alive;}



#include "../../cpp/game/PatchouliStory.hpp"
static std::array<u8,0x1a00> patchouliStoryOtherRaw;
static void patchouli_story_fields(bool load){auto& s=patchouliState.story;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,patchouliRaw.data()+at,sizeof(v));else std::memcpy(patchouliRaw.data()+at,&v,sizeof(v));};field(0x6e4,s.step);field(0x6e5,s.opponent);field(0x713,s.nextStage);for(u32 i=0;i<4;i++){field(0xf14+i*4,s.x[i]);field(0xf3c+i*4,s.y[i]);field(0xfdc+i,s.alpha[i]);}}
API(patchouli_story_load) void patchouli_story_load(const u8* other,const u8* settings,u32 mask){const auto save=actorFixture;const auto raw=actorRaw;actor_load(other,0);storyOther=actorFixture;std::memcpy(patchouliStoryOtherRaw.data(),other,patchouliStoryOtherRaw.size());actorFixture=save;actorRaw=raw;patchouli_story_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);storyEnvironment.completedStages=settings[8];storyEnvironment.route=settings[9];storyEventCapture.events.clear();storyEventCapture.player=&actorFixture;storyEventCapture.dialogueMask=mask;storyEventCapture.calls=0;}
API(patchouli_story_setup) void patchouli_story_setup(const u8* other,const u8* settings){patchouli_story_load(other,settings,0);initialize_patchouli_story(actorFixture,storyOther,patchouliState.story,storyEnvironment);}
API(patchouli_story_advance) void patchouli_story_advance(){advance_patchouli_story(actorFixture,storyOther,patchouliState.story,patchouliState.introWait,storyEnvironment,storyEventCapture);}
API(patchouli_story_snapshot) const u8* patchouli_story_snapshot(){patchouli_snapshot();patchouli_story_fields(false);return patchouliRaw.data();}
API(patchouli_story_other) const u8* patchouli_story_other(){const auto save=actorFixture;const auto raw=actorRaw;actorFixture=storyOther;std::memcpy(actorRaw.data(),patchouliStoryOtherRaw.data(),actorRaw.size());actor_snapshot();std::memcpy(patchouliStoryOtherRaw.data(),actorRaw.data(),actorRaw.size());actorFixture=save;actorRaw=raw;return patchouliStoryOtherRaw.data();}
API(patchouli_story_draw) u32 patchouli_story_draw(u32 stage,u32 filter){patchouli_story_fields(true);storyGraphics.filter(Filter(filter));storyDraws.clear();patchouliState.story.render(u8(stage),actorFixture,patchouliState.captionWait,storyGraphics,{0,1,2,3});return storyDraws.size();}


#include "../../cpp/game/YoumuCharacter.hpp"
static YoumuCharacter youmuCharacter;
static u32 youmuHistorySnapshotCount=0;static bool youmuHistorySnapshotChanged=false;
static YoumuState youmuState;static CharacterAIContext youmuAIContext;static std::array<u8,0x1a00> youmuRaw;
static void youmu_fixture_fields(bool load){auto& s=youmuState;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,youmuRaw.data()+at,sizeof(v));else std::memcpy(youmuRaw.data()+at,&v,sizeof(v));};field(0xf00,s.impactX);field(0xf02,s.impactY);field(0xf04,s.emissionIndex);field(0xf06,s.emissionDelay);field(0xf08,s.effectLoops);field(0xf0a,s.summonWait);field(0xf0c,s.phantomActivated);field(0xf0e,s.phantomSpawned);field(0xf10,s.phantomTime);field(0xf12,s.phantomAttacking);field(0xf14,s.farRangeFrames);field(0xefc,s.introWait);field(0xefe,s.captionWait);}
API(youmu_load) void youmu_load(const u8* p,u32 size,i32 difficulty){youmuHistorySnapshotChanged=false;actor_load(p,0);youmuRaw.fill(0);std::memcpy(youmuRaw.data(),p,std::min(size,u32(youmuRaw.size())));youmu_fixture_fields(true);youmuState.history.clear();youmuState.difficulty=i8(difficulty);recoveryCapture.events.clear();}
API(youmu_snapshot) const u8* youmu_snapshot(){actor_snapshot();std::memcpy(youmuRaw.data(),actorRaw.data(),actorRaw.size());youmu_fixture_fields(false);if(youmuHistorySnapshotChanged)std::memcpy(youmuRaw.data()+0xff4,&youmuHistorySnapshotCount,4);return youmuRaw.data();}
API(youmu_input_command) u32 youmu_input_command(const u8* p,i32 facing){InputHistory history;std::memcpy(history.frames.data(),p,90);return recognize_youmu_command(history,i8(facing));}
API(youmu_reset) void youmu_reset(){youmuCharacter.actor=actorFixture;youmuCharacter.state=youmuState;youmuCharacter.reset(actorCoreEvents);actorFixture=youmuCharacter.actor;youmuState=youmuCharacter.state;youmuHistorySnapshotChanged=true;youmuHistorySnapshotCount=0;}
API(youmu_commands) void youmu_commands(const u8* p){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);select_youmu_commands(actorFixture,other,youmuState);}
API(youmu_ai_load) void youmu_ai_load(i32 duel,i32 story){youmuAIContext={duel,story};}
API(youmu_ai_advance) void youmu_ai_advance(const u8* p,u32 story){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);other.motion.y=fixture_read<float>(p,0x48);other.animation.cursor.action=fixture_read<i16>(p,0x60);if(story)choose_youmu_story_input(actorFixture,other,youmuState,replayStreams,youmuAIContext);else choose_youmu_duel_input(actorFixture,other,youmuState,replayStreams,youmuAIContext);}
API(youmu_ai_walk) i32 youmu_ai_walk(u32 story){return story?youmuAIContext.storyWalkFrames:youmuAIContext.duelWalkFrames;}
API(youmu_frame_advance) void youmu_frame_advance(const u8* p,u32 mode){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_youmu_frame(actorFixture,marisaOther,youmuState,GameMode(mode),replayStreams,recoveryCapture);youmuHistorySnapshotChanged=true;youmuHistorySnapshotCount=youmuState.history.size();}
API(youmu_frame_other) const u8* youmu_frame_other(){return marisa_action_other();}

API(youmu_action_advance) void youmu_action_advance(const u8* p,u32 mode){const auto save=actorFixture;const auto raw=actorRaw;actor_load(p,0);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;youmuCharacter.actor=actorFixture;youmuCharacter.state=youmuState;youmuCharacter.advance_action(marisaOther,GameMode(mode),replayStreams,0,actorCoreEvents,recoveryCapture);actorFixture=youmuCharacter.actor;youmuState=youmuCharacter.state;}
API(youmu_action_other) const u8* youmu_action_other(){return marisa_action_other();}
API(youmu_trails_configure) void youmu_trails_configure(i32 interval,u32 mask){marisa_trails_configure(interval,mask);}
API(youmu_trails_state) const u32* youmu_trails_state(){return marisa_trails_state();}


#include "../../cpp/game/YoumuObjects.hpp"
static YoumuObject youmuObject;static std::array<u8,0xe8> youmuObjectRaw;
static void youmu_object_fixture_fields(bool load){
    auto& a=youmuObject;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,youmuObjectRaw.data()+at,sizeof(v));else std::memcpy(youmuObjectRaw.data()+at,&v,sizeof(v));};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(youmuObjectRaw[0x11])<<24)|(u32(youmuObjectRaw[0x12])<<16)|(u32(youmuObjectRaw[0x13])<<8)|youmuObjectRaw[0x14];else for(u32 i=0;i<4;i++)youmuObjectRaw[0x11+i]=u8(a.pose.color>>(24-i*8));
    field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);if(load)a.pose.active=youmuObjectRaw[0x40]!=0;else youmuObjectRaw[0x40]=a.pose.active;
    field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x67,a.order);field(0x68,a.group);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.hits);field(0x82,a.freeze);field(0x84,a.recoveryTimers);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.sourcePower);field(0xa4,a.sourceModifier);
    field(0xc8,a.parameters);field(0xd8,a.counter);field(0xda,a.timer);field(0xdc,a.angle);field(0xde,a.cycle);field(0xe0,a.variant);field(0xe2,a.auxiliary);
}

API(youmu_object_load) void youmu_object_load(const u8* p,const u8* owner,i32 difficulty){youmu_load(owner,0x1a00,difficulty);youmuObject={};std::memcpy(youmuObjectRaw.data(),p,youmuObjectRaw.size());youmu_object_fixture_fields(true);youmuObject.animation.pattern=&patterns;youmuObject.animation.set(youmuObject.animation.cursor.action,youmuObject.animation.cursor.index,youmuObject.animation.cursor.elapsed);youmuObject.alive=true;}
API(youmu_object_advance) void youmu_object_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_youmu_object(youmuObject,actorFixture,marisaOther,youmuState,replayStreams,recoveryCapture);}
API(youmu_object_snapshot) const u8* youmu_object_snapshot(){youmu_object_fixture_fields(false);return youmuObjectRaw.data();}
API(youmu_object_alive) u32 youmu_object_alive(){return youmuObject.alive;}



#include "../../cpp/game/YoumuStory.hpp"
static std::array<u8,0x1a00> youmuStoryOtherRaw;
static void youmu_story_fields(bool load){auto& s=youmuState.story;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,youmuRaw.data()+at,sizeof(v));else std::memcpy(youmuRaw.data()+at,&v,sizeof(v));};field(0x6e4,s.step);field(0x6e5,s.opponent);field(0x713,s.nextStage);for(u32 i=0;i<4;i++){field(0xf18+i*4,s.x[i]);field(0xf40+i*4,s.y[i]);field(0xfe0+i,s.alpha[i]);}}
API(youmu_story_load) void youmu_story_load(const u8* other,const u8* settings,u32 mask){const auto save=actorFixture;const auto raw=actorRaw;actor_load(other,0);storyOther=actorFixture;std::memcpy(youmuStoryOtherRaw.data(),other,youmuStoryOtherRaw.size());actorFixture=save;actorRaw=raw;youmu_story_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);storyEnvironment.completedStages=settings[8];storyEnvironment.route=settings[9];storyEventCapture.events.clear();storyEventCapture.player=&actorFixture;storyEventCapture.dialogueMask=mask;storyEventCapture.calls=0;}
API(youmu_story_setup) void youmu_story_setup(const u8* other,const u8* settings){youmu_story_load(other,settings,0);initialize_youmu_story(actorFixture,storyOther,youmuState.story,storyEnvironment);}
API(youmu_story_advance) void youmu_story_advance(){advance_youmu_story(actorFixture,storyOther,youmuState.story,youmuState.introWait,storyEnvironment,storyEventCapture);}
API(youmu_story_snapshot) const u8* youmu_story_snapshot(){youmu_snapshot();youmu_story_fields(false);return youmuRaw.data();}
API(youmu_story_other) const u8* youmu_story_other(){const auto save=actorFixture;const auto raw=actorRaw;actorFixture=storyOther;std::memcpy(actorRaw.data(),youmuStoryOtherRaw.data(),actorRaw.size());actor_snapshot();std::memcpy(youmuStoryOtherRaw.data(),actorRaw.data(),actorRaw.size());actorFixture=save;actorRaw=raw;return youmuStoryOtherRaw.data();}
API(youmu_story_draw) u32 youmu_story_draw(u32 stage,u32 filter){youmu_story_fields(true);storyGraphics.filter(Filter(filter));storyDraws.clear();youmuState.story.render(u8(stage),actorFixture,youmuState.captionWait,storyGraphics,{0,1,2,3});return storyDraws.size();}


API(youmu_history_load) void youmu_history_load(const u8* p,u32 count){youmuState.history.clear();for(u32 i=0;i<count;i++){const auto* v=p+i*16;youmuState.history.push_back({fixture_read<i16>(v,0),fixture_read<i16>(v,2),fixture_read<float>(v,4),fixture_read<float>(v,8),fixture_read<i8>(v,12),fixture_read<i16>(v,14)});}}
API(youmu_history_count) u32 youmu_history_count(){return youmuState.history.size();}
API(youmu_history_entry) const u8* youmu_history_entry(u32 i){static std::array<u8,16> raw{};raw.fill(0);if(i<youmuState.history.size()){const auto& p=youmuState.history[i];std::memcpy(raw.data(),&p.action,2);std::memcpy(raw.data()+2,&p.index,2);std::memcpy(raw.data()+4,&p.x,4);std::memcpy(raw.data()+8,&p.y,4);raw[12]=u8(p.facing);std::memcpy(raw.data()+14,&p.hits,2);}return raw.data();}

#include "../../cpp/game/RemiliaCharacter.hpp"
static RemiliaCharacter remiliaCharacter;
static RemiliaState remiliaState;static CharacterAIContext remiliaAIContext;static std::array<u8,0x1a00> remiliaRaw;
static void remilia_fixture_fields(bool load){auto& s=remiliaState;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,remiliaRaw.data()+at,sizeof(v));else std::memcpy(remiliaRaw.data()+at,&v,sizeof(v));};field(0xf00,s.impactX);field(0xf02,s.impactY);field(0xf04,s.aimAngle);field(0xf06,s.emissionDelay);field(0xf08,s.effectLoops);field(0xf0a,s.guardEffectSent);field(0xf0c,s.farRangeFrames);field(0xefc,s.introWait);field(0xefe,s.captionWait);}
API(remilia_load) void remilia_load(const u8* p,u32 size,i32 difficulty){actor_load(p,0);remiliaRaw.fill(0);std::memcpy(remiliaRaw.data(),p,std::min(size,u32(remiliaRaw.size())));remilia_fixture_fields(true);remiliaState.difficulty=i8(difficulty);recoveryCapture.events.clear();}
API(remilia_snapshot) const u8* remilia_snapshot(){actor_snapshot();std::memcpy(remiliaRaw.data(),actorRaw.data(),actorRaw.size());remilia_fixture_fields(false);return remiliaRaw.data();}
API(remilia_input_command) u32 remilia_input_command(const u8* p,i32 facing){InputHistory history;std::memcpy(history.frames.data(),p,90);return recognize_remilia_command(history,i8(facing));}
API(remilia_reset) void remilia_reset(){remiliaCharacter.actor=actorFixture;remiliaCharacter.state=remiliaState;remiliaCharacter.reset(actorCoreEvents);actorFixture=remiliaCharacter.actor;remiliaState=remiliaCharacter.state;}
API(remilia_commands) void remilia_commands(const u8* p){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);select_remilia_commands(actorFixture,other,remiliaState);}
API(remilia_ai_load) void remilia_ai_load(i32 duel,i32 story){remiliaAIContext={duel,story};}
API(remilia_ai_advance) void remilia_ai_advance(const u8* p,u32 story){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);other.motion.y=fixture_read<float>(p,0x48);other.animation.cursor.action=fixture_read<i16>(p,0x60);if(story)choose_remilia_story_input(actorFixture,other,remiliaState,replayStreams.random,remiliaAIContext);else choose_remilia_duel_input(actorFixture,other,remiliaState,replayStreams.random,remiliaAIContext);}
API(remilia_ai_walk) i32 remilia_ai_walk(u32 story){return story?remiliaAIContext.storyWalkFrames:remiliaAIContext.duelWalkFrames;}
API(remilia_frame_advance) void remilia_frame_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_remilia_frame(actorFixture,marisaOther,remiliaState,replayStreams,recoveryCapture);}
API(remilia_frame_other) const u8* remilia_frame_other(){return marisa_action_other();}

API(remilia_action_advance) void remilia_action_advance(const u8* p,u32 mode){const auto save=actorFixture;const auto raw=actorRaw;actor_load(p,0);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;remiliaCharacter.actor=actorFixture;remiliaCharacter.state=remiliaState;remiliaCharacter.advance_action(marisaOther,GameMode(mode),replayStreams,0,actorCoreEvents,recoveryCapture);actorFixture=remiliaCharacter.actor;remiliaState=remiliaCharacter.state;}
API(remilia_action_other) const u8* remilia_action_other(){return marisa_action_other();}
API(remilia_trails_configure) void remilia_trails_configure(i32 interval,u32 mask){marisa_trails_configure(interval,mask);}
API(remilia_trails_state) const u32* remilia_trails_state(){return marisa_trails_state();}


#include "../../cpp/game/RemiliaObjects.hpp"
static RemiliaObject remiliaObject;static std::array<u8,0xe8> remiliaObjectRaw;
static void remilia_object_fixture_fields(bool load){
    auto& a=remiliaObject;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,remiliaObjectRaw.data()+at,sizeof(v));else std::memcpy(remiliaObjectRaw.data()+at,&v,sizeof(v));};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(remiliaObjectRaw[0x11])<<24)|(u32(remiliaObjectRaw[0x12])<<16)|(u32(remiliaObjectRaw[0x13])<<8)|remiliaObjectRaw[0x14];else for(u32 i=0;i<4;i++)remiliaObjectRaw[0x11+i]=u8(a.pose.color>>(24-i*8));
    field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);if(load)a.pose.active=remiliaObjectRaw[0x40]!=0;else remiliaObjectRaw[0x40]=a.pose.active;
    field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x67,a.order);field(0x68,a.group);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.hits);field(0x82,a.freeze);field(0x84,a.recoveryTimers);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.sourcePower);field(0xa4,a.sourceModifier);
    field(0xc8,a.parameters);field(0xd8,a.counter);field(0xda,a.timer);field(0xdc,a.angle);field(0xde,a.cycle);field(0xe0,a.variant);field(0xe2,a.auxiliary);
}

API(remilia_object_load) void remilia_object_load(const u8* p,const u8* owner,i32 difficulty){remilia_load(owner,0x1a00,difficulty);remiliaObject={};std::memcpy(remiliaObjectRaw.data(),p,remiliaObjectRaw.size());remilia_object_fixture_fields(true);remiliaObject.animation.pattern=&patterns;remiliaObject.animation.set(remiliaObject.animation.cursor.action,remiliaObject.animation.cursor.index,remiliaObject.animation.cursor.elapsed);remiliaObject.alive=true;}
API(remilia_object_advance) void remilia_object_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_remilia_object(remiliaObject,actorFixture,marisaOther,remiliaState,replayStreams,recoveryCapture);}
API(remilia_object_snapshot) const u8* remilia_object_snapshot(){remilia_object_fixture_fields(false);return remiliaObjectRaw.data();}
API(remilia_object_alive) u32 remilia_object_alive(){return remiliaObject.alive;}



#include "../../cpp/game/RemiliaStory.hpp"
static std::array<u8,0x1a00> remiliaStoryOtherRaw;
static void remilia_story_fields(bool load){auto& s=remiliaState.story;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,remiliaRaw.data()+at,sizeof(v));else std::memcpy(remiliaRaw.data()+at,&v,sizeof(v));};field(0x6e4,s.step);field(0x6e5,s.opponent);field(0x713,s.nextStage);for(u32 i=0;i<4;i++){field(0xf10+i*4,s.x[i]);field(0xf38+i*4,s.y[i]);field(0xfd8+i,s.alpha[i]);}}
API(remilia_story_load) void remilia_story_load(const u8* other,const u8* settings,u32 mask){const auto save=actorFixture;const auto raw=actorRaw;actor_load(other,0);storyOther=actorFixture;std::memcpy(remiliaStoryOtherRaw.data(),other,remiliaStoryOtherRaw.size());actorFixture=save;actorRaw=raw;remilia_story_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);storyEnvironment.completedStages=settings[8];storyEnvironment.route=settings[9];storyEventCapture.events.clear();storyEventCapture.player=&actorFixture;storyEventCapture.dialogueMask=mask;storyEventCapture.calls=0;}
API(remilia_story_setup) void remilia_story_setup(const u8* other,const u8* settings){remilia_story_load(other,settings,0);initialize_remilia_story(actorFixture,storyOther,remiliaState.story,storyEnvironment);}
API(remilia_story_advance) void remilia_story_advance(){advance_remilia_story(actorFixture,storyOther,remiliaState.story,remiliaState.introWait,storyEnvironment,storyEventCapture);}
API(remilia_story_snapshot) const u8* remilia_story_snapshot(){remilia_snapshot();remilia_story_fields(false);return remiliaRaw.data();}
API(remilia_story_other) const u8* remilia_story_other(){const auto save=actorFixture;const auto raw=actorRaw;actorFixture=storyOther;std::memcpy(actorRaw.data(),remiliaStoryOtherRaw.data(),actorRaw.size());actor_snapshot();std::memcpy(remiliaStoryOtherRaw.data(),actorRaw.data(),actorRaw.size());actorFixture=save;actorRaw=raw;return remiliaStoryOtherRaw.data();}
API(remilia_story_draw) u32 remilia_story_draw(u32 stage,u32 filter){remilia_story_fields(true);storyGraphics.filter(Filter(filter));storyDraws.clear();remiliaState.story.render(u8(stage),actorFixture,remiliaState.captionWait,storyGraphics,{0,1,2,3});return storyDraws.size();}


#include "../../cpp/game/YuyukoCharacter.hpp"
static YuyukoCharacter yuyukoCharacter;
static YuyukoState yuyukoState;static CharacterAIContext yuyukoAIContext;static std::array<u8,0x1a00> yuyukoRaw;
static void yuyuko_fixture_fields(bool load){auto& s=yuyukoState;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,yuyukoRaw.data()+at,sizeof(v));else std::memcpy(yuyukoRaw.data()+at,&v,sizeof(v));};field(0xf00,s.impactX);field(0xf02,s.impactY);field(0xf04,s.aimAngle);field(0xf06,s.emissionDelay);field(0xf08,s.effectLoops);field(0xf0a,s.guardEffectSent);field(0xf0c,s.orbitRadius);field(0xf0e,s.orbitAngle);field(0xf10,s.farRangeFrames);field(0xefc,s.introWait);field(0xefe,s.captionWait);}
API(yuyuko_load) void yuyuko_load(const u8* p,u32 size,i32 difficulty){actor_load(p,0);yuyukoRaw.fill(0);std::memcpy(yuyukoRaw.data(),p,std::min(size,u32(yuyukoRaw.size())));yuyuko_fixture_fields(true);yuyukoState.difficulty=i8(difficulty);recoveryCapture.events.clear();}
API(yuyuko_snapshot) const u8* yuyuko_snapshot(){actor_snapshot();std::memcpy(yuyukoRaw.data(),actorRaw.data(),actorRaw.size());yuyuko_fixture_fields(false);return yuyukoRaw.data();}
API(yuyuko_input_command) u32 yuyuko_input_command(const u8* p,i32 facing){InputHistory history;std::memcpy(history.frames.data(),p,90);return recognize_yuyuko_command(history,i8(facing));}
API(yuyuko_reset) void yuyuko_reset(){yuyukoCharacter.actor=actorFixture;yuyukoCharacter.state=yuyukoState;yuyukoCharacter.reset(actorCoreEvents);actorFixture=yuyukoCharacter.actor;yuyukoState=yuyukoCharacter.state;}
API(yuyuko_commands) void yuyuko_commands(const u8* p){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);select_yuyuko_commands(actorFixture,other,yuyukoState);}
API(yuyuko_ai_load) void yuyuko_ai_load(i32 duel,i32 story){yuyukoAIContext={duel,story};}
API(yuyuko_ai_advance) void yuyuko_ai_advance(const u8* p,u32 story){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);other.motion.y=fixture_read<float>(p,0x48);other.animation.cursor.action=fixture_read<i16>(p,0x60);if(story)choose_yuyuko_story_input(actorFixture,other,yuyukoState,replayStreams.random,yuyukoAIContext);else choose_yuyuko_duel_input(actorFixture,other,yuyukoState,replayStreams.random,yuyukoAIContext);}
API(yuyuko_ai_walk) i32 yuyuko_ai_walk(u32 story){return story?yuyukoAIContext.storyWalkFrames:yuyukoAIContext.duelWalkFrames;}
API(yuyuko_frame_advance) void yuyuko_frame_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_yuyuko_frame(actorFixture,marisaOther,yuyukoState,replayStreams,recoveryCapture);}
API(yuyuko_frame_other) const u8* yuyuko_frame_other(){return marisa_action_other();}

API(yuyuko_action_advance) void yuyuko_action_advance(const u8* p,u32 mode){const auto save=actorFixture;const auto raw=actorRaw;actor_load(p,0);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;yuyukoCharacter.actor=actorFixture;yuyukoCharacter.state=yuyukoState;yuyukoCharacter.advance_action(marisaOther,GameMode(mode),replayStreams,0,actorCoreEvents,recoveryCapture);actorFixture=yuyukoCharacter.actor;yuyukoState=yuyukoCharacter.state;}
API(yuyuko_action_other) const u8* yuyuko_action_other(){return marisa_action_other();}
API(yuyuko_trails_configure) void yuyuko_trails_configure(i32 interval,u32 mask){marisa_trails_configure(interval,mask);}
API(yuyuko_trails_state) const u32* yuyuko_trails_state(){return marisa_trails_state();}


#include "../../cpp/game/YuyukoObjects.hpp"
static YuyukoObject yuyukoObject;static std::array<u8,0xe8> yuyukoObjectRaw;
static void yuyuko_object_fixture_fields(bool load){
    auto& a=yuyukoObject;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,yuyukoObjectRaw.data()+at,sizeof(v));else std::memcpy(yuyukoObjectRaw.data()+at,&v,sizeof(v));};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(yuyukoObjectRaw[0x11])<<24)|(u32(yuyukoObjectRaw[0x12])<<16)|(u32(yuyukoObjectRaw[0x13])<<8)|yuyukoObjectRaw[0x14];else for(u32 i=0;i<4;i++)yuyukoObjectRaw[0x11+i]=u8(a.pose.color>>(24-i*8));
    field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);if(load)a.pose.active=yuyukoObjectRaw[0x40]!=0;else yuyukoObjectRaw[0x40]=a.pose.active;
    field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x4c,a.depth);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x67,a.order);field(0x68,a.group);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.hits);field(0x82,a.freeze);field(0x84,a.recoveryTimers);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.sourcePower);field(0xa4,a.sourceModifier);
    field(0xc8,a.parameters);field(0xd8,a.counter);field(0xda,a.timer);field(0xdc,a.angle);field(0xde,a.cycle);field(0xe0,a.variant);field(0xe2,a.auxiliary);
}

API(yuyuko_object_load) void yuyuko_object_load(const u8* p,const u8* owner,i32 difficulty){yuyuko_load(owner,0x1a00,difficulty);yuyukoObject={};std::memcpy(yuyukoObjectRaw.data(),p,yuyukoObjectRaw.size());yuyuko_object_fixture_fields(true);yuyukoObject.animation.pattern=&patterns;yuyukoObject.animation.set(yuyukoObject.animation.cursor.action,yuyukoObject.animation.cursor.index,yuyukoObject.animation.cursor.elapsed);yuyukoObject.alive=true;}
API(yuyuko_object_advance) void yuyuko_object_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_yuyuko_object(yuyukoObject,actorFixture,marisaOther,yuyukoState,replayStreams,recoveryCapture);}
API(yuyuko_object_snapshot) const u8* yuyuko_object_snapshot(){yuyuko_object_fixture_fields(false);return yuyukoObjectRaw.data();}
API(yuyuko_object_alive) u32 yuyuko_object_alive(){return yuyukoObject.alive;}



#include "../../cpp/game/YuyukoStory.hpp"
static std::array<u8,0x1a00> yuyukoStoryOtherRaw;
static void yuyuko_story_fields(bool load){auto& s=yuyukoState.story;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,yuyukoRaw.data()+at,sizeof(v));else std::memcpy(yuyukoRaw.data()+at,&v,sizeof(v));};field(0x6e4,s.step);field(0x6e5,s.opponent);field(0x713,s.nextStage);for(u32 i=0;i<4;i++){field(0xf14+i*4,s.x[i]);field(0xf3c+i*4,s.y[i]);field(0xfdc+i,s.alpha[i]);}}
API(yuyuko_story_load) void yuyuko_story_load(const u8* other,const u8* settings,u32 mask){const auto save=actorFixture;const auto raw=actorRaw;actor_load(other,0);storyOther=actorFixture;std::memcpy(yuyukoStoryOtherRaw.data(),other,yuyukoStoryOtherRaw.size());actorFixture=save;actorRaw=raw;yuyuko_story_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);storyEnvironment.completedStages=settings[8];storyEnvironment.route=settings[9];storyEventCapture.events.clear();storyEventCapture.player=&actorFixture;storyEventCapture.dialogueMask=mask;storyEventCapture.calls=0;}
API(yuyuko_story_setup) void yuyuko_story_setup(const u8* other,const u8* settings){yuyuko_story_load(other,settings,0);initialize_yuyuko_story(actorFixture,storyOther,yuyukoState.story,storyEnvironment);}
API(yuyuko_story_advance) void yuyuko_story_advance(){advance_yuyuko_story(actorFixture,storyOther,yuyukoState.story,yuyukoState.introWait,storyEnvironment,storyEventCapture);}
API(yuyuko_story_snapshot) const u8* yuyuko_story_snapshot(){yuyuko_snapshot();yuyuko_story_fields(false);return yuyukoRaw.data();}
API(yuyuko_story_other) const u8* yuyuko_story_other(){const auto save=actorFixture;const auto raw=actorRaw;actorFixture=storyOther;std::memcpy(actorRaw.data(),yuyukoStoryOtherRaw.data(),actorRaw.size());actor_snapshot();std::memcpy(yuyukoStoryOtherRaw.data(),actorRaw.data(),actorRaw.size());actorFixture=save;actorRaw=raw;return yuyukoStoryOtherRaw.data();}
API(yuyuko_story_draw) u32 yuyuko_story_draw(u32 stage,u32 filter){yuyuko_story_fields(true);storyGraphics.filter(Filter(filter));storyDraws.clear();yuyukoState.story.render(u8(stage),actorFixture,yuyukoState.captionWait,storyGraphics,{0,1,2,3});return storyDraws.size();}



API(object_scene_load) void object_scene_load(u32 color,u32 alpha){recoveryCapture.fadeColor=color;recoveryCapture.fadeAlpha=u8(alpha);}
API(object_scene_color) u32 object_scene_color(){return recoveryCapture.fadeColor;}
API(object_scene_alpha) u32 object_scene_alpha(){return recoveryCapture.fadeAlpha;}

#include "../../cpp/game/YukariCharacter.hpp"
static YukariCharacter yukariCharacter;
static YukariState yukariState;static CharacterAIContext yukariAIContext;static std::array<u8,0x1a00> yukariRaw;
static void yukari_fixture_fields(bool load){auto& s=yukariState;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,yukariRaw.data()+at,sizeof(v));else std::memcpy(yukariRaw.data()+at,&v,sizeof(v));};field(0xf00,s.impactX);field(0xf02,s.impactY);field(0xf04,s.emissionIndex);field(0xf06,s.emissionDelay);field(0xf08,s.effectLoops);field(0xf0a,s.guardEffectSent);field(0xf0c,s.portalTimer);field(0xf0e,s.portalX);field(0xf10,s.portalY);field(0xf12,s.orbitAngle);field(0xf14,s.portalCount);field(0xf16,s.portalAngle);field(0xf18,s.lastPortalX);field(0xf1a,s.lastPortalY);field(0xf30,s.particleDelay);field(0xf32,s.farRangeFrames);field(0xefc,s.introWait);field(0xefe,s.captionWait);}
API(yukari_load) void yukari_load(const u8* p,u32 size,i32 difficulty){actor_load(p,0);yukariRaw.fill(0);std::memcpy(yukariRaw.data(),p,std::min(size,u32(yukariRaw.size())));yukari_fixture_fields(true);yukariState.difficulty=i8(difficulty);recoveryCapture.events.clear();}
API(yukari_snapshot) const u8* yukari_snapshot(){actor_snapshot();std::memcpy(yukariRaw.data(),actorRaw.data(),actorRaw.size());yukari_fixture_fields(false);return yukariRaw.data();}
API(yukari_input_command) u32 yukari_input_command(const u8* p,i32 facing){InputHistory history;std::memcpy(history.frames.data(),p,90);return recognize_yukari_command(history,i8(facing));}
API(yukari_reset) void yukari_reset(){yukariCharacter.actor=actorFixture;yukariCharacter.state=yukariState;yukariCharacter.reset(actorCoreEvents);actorFixture=yukariCharacter.actor;yukariState=yukariCharacter.state;}
API(yukari_commands) void yukari_commands(const u8* p){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);select_yukari_commands(actorFixture,other,yukariState);}
API(yukari_ai_load) void yukari_ai_load(i32 duel,i32 story){yukariAIContext={duel,story};}
API(yukari_ai_advance) void yukari_ai_advance(const u8* p,u32 story){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);other.motion.y=fixture_read<float>(p,0x48);other.animation.cursor.action=fixture_read<i16>(p,0x60);if(story)choose_yukari_story_input(actorFixture,other,yukariState,replayStreams.random,yukariAIContext);else choose_yukari_duel_input(actorFixture,other,yukariState,replayStreams.random,yukariAIContext);}
API(yukari_ai_walk) i32 yukari_ai_walk(u32 story){return story?yukariAIContext.storyWalkFrames:yukariAIContext.duelWalkFrames;}
API(yukari_frame_advance) void yukari_frame_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_yukari_frame(actorFixture,marisaOther,yukariState,replayStreams,recoveryCapture);}
API(yukari_frame_other) const u8* yukari_frame_other(){return marisa_action_other();}

API(yukari_action_advance) void yukari_action_advance(const u8* p,u32 mode){const auto save=actorFixture;const auto raw=actorRaw;actor_load(p,0);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;yukariCharacter.actor=actorFixture;yukariCharacter.state=yukariState;yukariCharacter.advance_action(marisaOther,GameMode(mode),replayStreams,0,actorCoreEvents,recoveryCapture);actorFixture=yukariCharacter.actor;yukariState=yukariCharacter.state;}
API(yukari_action_other) const u8* yukari_action_other(){return marisa_action_other();}
API(yukari_trails_configure) void yukari_trails_configure(i32 interval,u32 mask){marisa_trails_configure(interval,mask);}
API(yukari_trails_state) const u32* yukari_trails_state(){return marisa_trails_state();}


#include "../../cpp/game/YukariObjects.hpp"
static YukariObject yukariObject;static std::array<u8,0xe8> yukariObjectRaw;
static void yukari_object_fixture_fields(bool load){
    auto& a=yukariObject;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,yukariObjectRaw.data()+at,sizeof(v));else std::memcpy(yukariObjectRaw.data()+at,&v,sizeof(v));};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(yukariObjectRaw[0x11])<<24)|(u32(yukariObjectRaw[0x12])<<16)|(u32(yukariObjectRaw[0x13])<<8)|yukariObjectRaw[0x14];else for(u32 i=0;i<4;i++)yukariObjectRaw[0x11+i]=u8(a.pose.color>>(24-i*8));
    field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);if(load)a.pose.active=yukariObjectRaw[0x40]!=0;else yukariObjectRaw[0x40]=a.pose.active;
    field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x4c,a.depth);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x67,a.order);field(0x68,a.group);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.hits);field(0x82,a.freeze);field(0x84,a.recoveryTimers);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.sourcePower);field(0xa4,a.sourceModifier);
    field(0xc8,a.parameters);field(0xd8,a.counter);field(0xda,a.timer);field(0xdc,a.angle);field(0xde,a.cycle);field(0xe0,a.variant);field(0xe2,a.auxiliary);
}

API(yukari_object_load) void yukari_object_load(const u8* p,const u8* owner,i32 difficulty){yukari_load(owner,0x1a00,difficulty);yukariObject={};std::memcpy(yukariObjectRaw.data(),p,yukariObjectRaw.size());yukari_object_fixture_fields(true);yukariObject.animation.pattern=&patterns;yukariObject.animation.set(yukariObject.animation.cursor.action,yukariObject.animation.cursor.index,yukariObject.animation.cursor.elapsed);yukariObject.alive=true;}
API(yukari_object_advance) void yukari_object_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_yukari_object(yukariObject,actorFixture,marisaOther,yukariState,replayStreams,recoveryCapture);}
API(yukari_object_snapshot) const u8* yukari_object_snapshot(){yukari_object_fixture_fields(false);return yukariObjectRaw.data();}
API(yukari_object_alive) u32 yukari_object_alive(){return yukariObject.alive;}



#include "../../cpp/game/YukariStory.hpp"
static std::array<u8,0x1a00> yukariStoryOtherRaw;
static void yukari_story_fields(bool load){auto& s=yukariState.story;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,yukariRaw.data()+at,sizeof(v));else std::memcpy(yukariRaw.data()+at,&v,sizeof(v));};field(0x6e4,s.step);field(0x6e5,s.opponent);field(0x713,s.nextStage);for(u32 i=0;i<4;i++){field(0xf34+i*4,s.x[i]);field(0xf5c+i*4,s.y[i]);field(0xffc+i,s.alpha[i]);}}
API(yukari_story_load) void yukari_story_load(const u8* other,const u8* settings,u32 mask){const auto save=actorFixture;const auto raw=actorRaw;actor_load(other,0);storyOther=actorFixture;std::memcpy(yukariStoryOtherRaw.data(),other,yukariStoryOtherRaw.size());actorFixture=save;actorRaw=raw;yukari_story_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);storyEnvironment.completedStages=settings[8];storyEnvironment.route=settings[9];storyEventCapture.events.clear();storyEventCapture.player=&actorFixture;storyEventCapture.dialogueMask=mask;storyEventCapture.calls=0;}
API(yukari_story_setup) void yukari_story_setup(const u8* other,const u8* settings){yukari_story_load(other,settings,0);initialize_yukari_story(actorFixture,storyOther,yukariState.story,storyEnvironment);}
API(yukari_story_advance) void yukari_story_advance(){advance_yukari_story(actorFixture,storyOther,yukariState.story,yukariState.introWait,storyEnvironment,storyEventCapture);}
API(yukari_story_snapshot) const u8* yukari_story_snapshot(){yukari_snapshot();yukari_story_fields(false);return yukariRaw.data();}
API(yukari_story_other) const u8* yukari_story_other(){const auto save=actorFixture;const auto raw=actorRaw;actorFixture=storyOther;std::memcpy(actorRaw.data(),yukariStoryOtherRaw.data(),actorRaw.size());actor_snapshot();std::memcpy(yukariStoryOtherRaw.data(),actorRaw.data(),actorRaw.size());actorFixture=save;actorRaw=raw;return yukariStoryOtherRaw.data();}
API(yukari_story_draw) u32 yukari_story_draw(u32 stage,u32 filter){yukari_story_fields(true);storyGraphics.filter(Filter(filter));storyDraws.clear();yukariState.story.render(u8(stage),actorFixture,yukariState.captionWait,storyGraphics,{0,1,2,3});return storyDraws.size();}




#include "../../cpp/game/MeilingCharacter.hpp"
static MeilingCharacter meilingCharacter;
static MeilingState meilingState;static CharacterAIContext meilingAIContext;static std::array<u8,0x1a00> meilingRaw;
static void meiling_fixture_fields(bool load){auto& s=meilingState;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,meilingRaw.data()+at,sizeof(v));else std::memcpy(meilingRaw.data()+at,&v,sizeof(v));};field(0xf00,s.impactX);field(0xf02,s.impactY);field(0xf04,s.emissionIndex);field(0xf06,s.emissionDelay);field(0xf08,s.effectLoops);field(0xf0a,s.guardEffectSent);field(0xf0c,s.spellLoops);field(0xf22,s.spellTimer);field(0xf24,s.spellAngle);field(0xf26,s.chargeFrames);field(0xf28,s.frameCounter);field(0xf2a,s.farRangeFrames);field(0xefc,s.introWait);field(0xefe,s.captionWait);}
API(meiling_load) void meiling_load(const u8* p,u32 size,i32 difficulty){actor_load(p,0);meilingRaw.fill(0);std::memcpy(meilingRaw.data(),p,std::min(size,u32(meilingRaw.size())));meiling_fixture_fields(true);meilingState.difficulty=i8(difficulty);recoveryCapture.events.clear();}
API(meiling_snapshot) const u8* meiling_snapshot(){actor_snapshot();std::memcpy(meilingRaw.data(),actorRaw.data(),actorRaw.size());meiling_fixture_fields(false);return meilingRaw.data();}
API(meiling_input_command) u32 meiling_input_command(const u8* p,i32 facing){InputHistory history;std::memcpy(history.frames.data(),p,90);return recognize_meiling_command(history,i8(facing));}
API(meiling_reset) void meiling_reset(){meilingCharacter.actor=actorFixture;meilingCharacter.state=meilingState;meilingCharacter.reset(actorCoreEvents);actorFixture=meilingCharacter.actor;meilingState=meilingCharacter.state;}
API(meiling_commands) void meiling_commands(const u8* p){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);select_meiling_commands(actorFixture,other,meilingState);}
API(meiling_ai_load) void meiling_ai_load(i32 duel,i32 story){meilingAIContext={duel,story};}
API(meiling_ai_advance) void meiling_ai_advance(const u8* p,u32 story){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);other.motion.y=fixture_read<float>(p,0x48);other.animation.cursor.action=fixture_read<i16>(p,0x60);if(story)choose_meiling_story_input(actorFixture,other,meilingState,replayStreams.random,meilingAIContext);else choose_meiling_duel_input(actorFixture,other,meilingState,replayStreams.random,meilingAIContext);}
API(meiling_ai_walk) i32 meiling_ai_walk(u32 story){return story?meilingAIContext.storyWalkFrames:meilingAIContext.duelWalkFrames;}
API(meiling_frame_advance) void meiling_frame_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_meiling_frame(actorFixture,marisaOther,meilingState,replayStreams,recoveryCapture);}
API(meiling_frame_other) const u8* meiling_frame_other(){return marisa_action_other();}

API(meiling_action_advance) void meiling_action_advance(const u8* p,u32 mode){const auto save=actorFixture;const auto raw=actorRaw;actor_load(p,0);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;meilingCharacter.actor=actorFixture;meilingCharacter.state=meilingState;meilingCharacter.advance_action(marisaOther,GameMode(mode),replayStreams,0,actorCoreEvents,recoveryCapture);actorFixture=meilingCharacter.actor;meilingState=meilingCharacter.state;}
API(meiling_action_other) const u8* meiling_action_other(){return marisa_action_other();}
API(meiling_trails_configure) void meiling_trails_configure(i32 interval,u32 mask){marisa_trails_configure(interval,mask);}
API(meiling_trails_state) const u32* meiling_trails_state(){return marisa_trails_state();}


#include "../../cpp/game/MeilingObjects.hpp"
static MeilingObject meilingObject;static std::array<u8,0xe8> meilingObjectRaw;
static void meiling_object_fixture_fields(bool load){
    auto& a=meilingObject;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,meilingObjectRaw.data()+at,sizeof(v));else std::memcpy(meilingObjectRaw.data()+at,&v,sizeof(v));};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(meilingObjectRaw[0x11])<<24)|(u32(meilingObjectRaw[0x12])<<16)|(u32(meilingObjectRaw[0x13])<<8)|meilingObjectRaw[0x14];else for(u32 i=0;i<4;i++)meilingObjectRaw[0x11+i]=u8(a.pose.color>>(24-i*8));
    field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);if(load)a.pose.active=meilingObjectRaw[0x40]!=0;else meilingObjectRaw[0x40]=a.pose.active;
    field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x4c,a.depth);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x67,a.order);field(0x68,a.group);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.hits);field(0x82,a.freeze);field(0x84,a.recoveryTimers);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.sourcePower);field(0xa4,a.sourceModifier);
    field(0xc8,a.parameters);field(0xd8,a.counter);field(0xda,a.timer);field(0xdc,a.angle);field(0xde,a.cycle);field(0xe0,a.variant);field(0xe2,a.auxiliary);
}

API(meiling_object_load) void meiling_object_load(const u8* p,const u8* owner,i32 difficulty){meiling_load(owner,0x1a00,difficulty);meilingObject={};std::memcpy(meilingObjectRaw.data(),p,meilingObjectRaw.size());meiling_object_fixture_fields(true);meilingObject.animation.pattern=&patterns;meilingObject.animation.set(meilingObject.animation.cursor.action,meilingObject.animation.cursor.index,meilingObject.animation.cursor.elapsed);meilingObject.alive=true;}
API(meiling_object_advance) void meiling_object_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_meiling_object(meilingObject,actorFixture,marisaOther,meilingState,replayStreams,recoveryCapture);}
API(meiling_object_snapshot) const u8* meiling_object_snapshot(){meiling_object_fixture_fields(false);return meilingObjectRaw.data();}
API(meiling_object_alive) u32 meiling_object_alive(){return meilingObject.alive;}



#include "../../cpp/game/MeilingStory.hpp"
static std::array<u8,0x1a00> meilingStoryOtherRaw;
static void meiling_story_fields(bool load){auto& s=meilingState.story;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,meilingRaw.data()+at,sizeof(v));else std::memcpy(meilingRaw.data()+at,&v,sizeof(v));};field(0x6e4,s.step);field(0x6e5,s.opponent);field(0x713,s.nextStage);for(u32 i=0;i<4;i++){field(0xf2c+i*4,s.x[i]);field(0xf54+i*4,s.y[i]);field(0xff4+i,s.alpha[i]);}}
API(meiling_story_load) void meiling_story_load(const u8* other,const u8* settings,u32 mask){const auto save=actorFixture;const auto raw=actorRaw;actor_load(other,0);storyOther=actorFixture;std::memcpy(meilingStoryOtherRaw.data(),other,meilingStoryOtherRaw.size());actorFixture=save;actorRaw=raw;meiling_story_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);storyEnvironment.completedStages=settings[8];storyEnvironment.route=settings[9];storyEventCapture.events.clear();storyEventCapture.player=&actorFixture;storyEventCapture.dialogueMask=mask;storyEventCapture.calls=0;}
API(meiling_story_setup) void meiling_story_setup(const u8* other,const u8* settings){meiling_story_load(other,settings,0);initialize_meiling_story(actorFixture,storyOther,meilingState.story,storyEnvironment);}
API(meiling_story_advance) void meiling_story_advance(){advance_meiling_story(actorFixture,storyOther,meilingState.story,meilingState.introWait,storyEnvironment,storyEventCapture);}
API(meiling_story_snapshot) const u8* meiling_story_snapshot(){meiling_snapshot();meiling_story_fields(false);return meilingRaw.data();}
API(meiling_story_other) const u8* meiling_story_other(){const auto save=actorFixture;const auto raw=actorRaw;actorFixture=storyOther;std::memcpy(actorRaw.data(),meilingStoryOtherRaw.data(),actorRaw.size());actor_snapshot();std::memcpy(meilingStoryOtherRaw.data(),actorRaw.data(),actorRaw.size());actorFixture=save;actorRaw=raw;return meilingStoryOtherRaw.data();}
API(meiling_story_draw) u32 meiling_story_draw(u32 stage,u32 filter){meiling_story_fields(true);storyGraphics.filter(Filter(filter));storyDraws.clear();meilingState.story.render(u8(stage),actorFixture,meilingState.captionWait,storyGraphics,{0,1,2,3});return storyDraws.size();}




#include "../../cpp/game/SuikaCharacter.hpp"
static SuikaCharacter suikaCharacter;
static SuikaState suikaState;static CharacterAIContext suikaAIContext;static std::array<u8,0x1a00> suikaRaw;
static void suika_fixture_fields(bool load){auto& s=suikaState;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,suikaRaw.data()+at,sizeof(v));else std::memcpy(suikaRaw.data()+at,&v,sizeof(v));};field(0xf00,s.impactX);field(0xf02,s.impactY);field(0xf04,s.spellLoops);field(0xf06,s.guardEffectSent);field(0xf1c,s.summonTimer);field(0xf1e,s.giantMode);field(0xf20,s.giantTicks);field(0xf22,s.anchorX);field(0xf24,s.anchorY);field(0xf26,s.farRangeFrames);field(0xf28,s.story.phaseTimer);field(0xf2a,s.endWait);field(0xefc,s.introWait);field(0xefe,s.captionWait);}
API(suika_load) void suika_load(const u8* p,u32 size,i32 difficulty){actor_load(p,0);suikaRaw.fill(0);std::memcpy(suikaRaw.data(),p,std::min(size,u32(suikaRaw.size())));suika_fixture_fields(true);suikaState.difficulty=i8(difficulty);recoveryCapture.events.clear();}
API(suika_snapshot) const u8* suika_snapshot(){actor_snapshot();std::memcpy(suikaRaw.data(),actorRaw.data(),actorRaw.size());suika_fixture_fields(false);return suikaRaw.data();}
API(suika_input_command) u32 suika_input_command(const u8* p,i32 facing){InputHistory history;std::memcpy(history.frames.data(),p,90);return recognize_suika_command(history,i8(facing));}
API(suika_reset) void suika_reset(){suikaCharacter.actor=actorFixture;suikaCharacter.state=suikaState;suikaCharacter.reset(actorCoreEvents);actorFixture=suikaCharacter.actor;suikaState=suikaCharacter.state;}
API(suika_commands) void suika_commands(const u8* p){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);select_suika_commands(actorFixture,other,suikaState);}
API(suika_ai_load) void suika_ai_load(i32 duel,i32 story){suikaAIContext={duel,story};}
API(suika_ai_advance) void suika_ai_advance(const u8* p,u32 story){FighterActor other;other.motion.x=fixture_read<float>(p,0x44);other.motion.y=fixture_read<float>(p,0x48);other.animation.cursor.action=fixture_read<i16>(p,0x60);if(story)choose_suika_story_input(actorFixture,other,suikaState,replayStreams.random,suikaAIContext);else choose_suika_duel_input(actorFixture,other,suikaState,replayStreams.random,suikaAIContext);}
API(suika_ai_walk) i32 suika_ai_walk(u32 story){return story?suikaAIContext.storyWalkFrames:suikaAIContext.duelWalkFrames;}
API(suika_frame_advance) void suika_frame_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_suika_frame(actorFixture,marisaOther,suikaState,replayStreams,recoveryCapture);}
API(suika_frame_other) const u8* suika_frame_other(){return marisa_action_other();}

API(suika_action_advance) void suika_action_advance(const u8* p,u32 mode){const auto save=actorFixture;const auto raw=actorRaw;actor_load(p,0);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;suikaCharacter.actor=actorFixture;suikaCharacter.state=suikaState;suikaCharacter.advance_action(marisaOther,GameMode(mode),replayStreams,0,actorCoreEvents,recoveryCapture);actorFixture=suikaCharacter.actor;suikaState=suikaCharacter.state;}
API(suika_action_other) const u8* suika_action_other(){return marisa_action_other();}
API(suika_trails_configure) void suika_trails_configure(i32 interval,u32 mask){marisa_trails_configure(interval,mask);}
API(suika_trails_state) const u32* suika_trails_state(){return marisa_trails_state();}


#include "../../cpp/game/SuikaObjects.hpp"
static SuikaObject suikaObject;static std::array<u8,0xe8> suikaObjectRaw;
static void suika_object_fixture_fields(bool load){
    auto& a=suikaObject;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,suikaObjectRaw.data()+at,sizeof(v));else std::memcpy(suikaObjectRaw.data()+at,&v,sizeof(v));};
    field(0x10,a.pose.flags);if(load)a.pose.color=(u32(suikaObjectRaw[0x11])<<24)|(u32(suikaObjectRaw[0x12])<<16)|(u32(suikaObjectRaw[0x13])<<8)|suikaObjectRaw[0x14];else for(u32 i=0;i<4;i++)suikaObjectRaw[0x11+i]=u8(a.pose.color>>(24-i*8));
    field(0x16,a.pose.projection);field(0x1c,a.pose.scale);field(0x28,a.pose.rotation);field(0x34,a.pose.offset);if(load)a.pose.active=suikaObjectRaw[0x40]!=0;else suikaObjectRaw[0x40]=a.pose.active;
    field(0x44,a.motion.x);field(0x48,a.motion.y);field(0x4c,a.depth);field(0x50,a.motion.velocityX);field(0x54,a.motion.velocityY);field(0x58,a.motion.accelerationX);field(0x5c,a.motion.accelerationY);
    field(0x60,a.animation.cursor.action);field(0x62,a.animation.cursor.index);field(0x64,a.animation.cursor.elapsed);field(0x66,a.motion.facing);field(0x67,a.order);field(0x68,a.group);field(0x70,a.animation.cursor.frameCount);field(0x72,a.animation.cursor.duration);
    field(0x7c,a.response);field(0x80,a.hits);field(0x82,a.freeze);field(0x84,a.recoveryTimers);field(0x8a,a.contactDelay);field(0x8c,a.attackPower);field(0x90,a.attackModifier);field(0x94,a.impulseX);field(0x98,a.impulseY);field(0x9c,a.bodyPower);field(0xa0,a.sourcePower);field(0xa4,a.sourceModifier);
    field(0xc8,a.parameters);field(0xd8,a.counter);field(0xda,a.timer);field(0xdc,a.angle);field(0xde,a.cycle);field(0xe0,a.variant);field(0xe2,a.auxiliary);
}

API(suika_object_load) void suika_object_load(const u8* p,const u8* owner,i32 difficulty){suika_load(owner,0x1a00,difficulty);suikaObject={};std::memcpy(suikaObjectRaw.data(),p,suikaObjectRaw.size());suika_object_fixture_fields(true);suikaObject.animation.pattern=&patterns;suikaObject.animation.set(suikaObject.animation.cursor.action,suikaObject.animation.cursor.index,suikaObject.animation.cursor.elapsed);suikaObject.alive=true;}
API(suika_object_advance) void suika_object_advance(const u8* p){const auto save=actorFixture;const auto raw=actorRaw;actorFixture={};std::memcpy(actorRaw.data(),p,actorRaw.size());actor_fixture_fields(true);marisaOther=actorFixture;marisaOtherRaw=actorRaw;actorFixture=save;actorRaw=raw;advance_suika_object(suikaObject,actorFixture,marisaOther,suikaState,replayStreams,recoveryCapture);}
API(suika_object_snapshot) const u8* suika_object_snapshot(){suika_object_fixture_fields(false);return suikaObjectRaw.data();}
API(suika_object_alive) u32 suika_object_alive(){return suikaObject.alive;}



#include "../../cpp/game/SuikaStory.hpp"
static std::array<u8,0x1a00> suikaStoryOtherRaw;
static void suika_story_fields(bool load){auto& s=suikaState.story;const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,suikaRaw.data()+at,sizeof(v));else std::memcpy(suikaRaw.data()+at,&v,sizeof(v));};field(0x6e4,s.step);field(0x6e5,s.opponent);field(0x713,s.nextStage);field(0xf28,s.phaseTimer);for(u32 i=0;i<4;i++){field(0xf2c+i*4,s.x[i]);field(0xf54+i*4,s.y[i]);field(0xff4+i,s.alpha[i]);}}
API(suika_story_load) void suika_story_load(const u8* other,const u8* settings,u32 mask){const auto save=actorFixture;const auto raw=actorRaw;actor_load(other,0);storyOther=actorFixture;std::memcpy(suikaStoryOtherRaw.data(),other,suikaStoryOtherRaw.size());actorFixture=save;actorRaw=raw;suika_story_fields(true);storyEnvironment.camera=cameraMotion;storyEnvironment.stage=settings[0];storyEnvironment.difficulty=settings[1];storyEnvironment.background=settings[2];storyEnvironment.fadeAlpha=settings[3];storyEnvironment.fadeColor=fixture_read<u32>(settings,4);storyEnvironment.completedStages=settings[8];storyEnvironment.route=settings[9];storyEnvironment.hudAlpha={settings[10],settings[11]};storyEventCapture.events.clear();storyEventCapture.player=&actorFixture;storyEventCapture.dialogueMask=mask;storyEventCapture.calls=0;}
API(suika_story_setup) void suika_story_setup(const u8* other,const u8* settings){suika_story_load(other,settings,0);initialize_suika_story(actorFixture,storyOther,suikaState.story,storyEnvironment);}
API(suika_story_advance) void suika_story_advance(){advance_suika_story(actorFixture,storyOther,suikaState.story,suikaState.introWait,storyEnvironment,storyEventCapture);}
API(suika_story_snapshot) const u8* suika_story_snapshot(){suika_snapshot();suika_story_fields(false);return suikaRaw.data();}
API(suika_story_other) const u8* suika_story_other(){const auto save=actorFixture;const auto raw=actorRaw;actorFixture=storyOther;std::memcpy(actorRaw.data(),suikaStoryOtherRaw.data(),actorRaw.size());actor_snapshot();std::memcpy(suikaStoryOtherRaw.data(),actorRaw.data(),actorRaw.size());actorFixture=save;actorRaw=raw;return suikaStoryOtherRaw.data();}
API(suika_story_draw) u32 suika_story_draw(u32 stage,u32 filter){suika_story_fields(true);storyGraphics.filter(Filter(filter));storyDraws.clear();suikaState.story.render(u8(stage),actorFixture,suikaState.endWait,storyGraphics,{0,1,2,3});return storyDraws.size();}




API(suika_story_hud) const u8* suika_story_hud(){return storyEnvironment.hudAlpha.data();}
#include "../../cpp/game/ImageRenderer.hpp"
struct ImageCaptureResources:SpriteResources {SpriteImage value{77,256,256};SpriteImage image(i16)override{return value;}};
static ImageCaptureResources imageCaptureResources;static ImageRenderer imageCapture(graphics,imageCaptureResources);
API(image_configure) void image_configure(u32 width,u32 height){imageCaptureResources.value={77,width,height};}
API(image_draw) void image_draw(float x,float y,u32 color,float ax,float ay,float scale,float rotation,u32 flags,u32 centered){imageCapture.image(0,x,y,color,ax,ay,scale,rotation,u8(flags),centered!=0);}
#include "../../cpp/game/BackgroundStage.hpp"
struct BackgroundDrawCapture final:GfxInterface,SpriteResources {
    struct Draw {u32 texture;Topology topology;PipelineState state;std::vector<ScreenVertex> vertices;};
    PipelineState state{};std::array<SpriteImage,2048> images{};std::vector<Draw> draws;u32 depthClears=0;
    PipelineState& pipeline()override{return state;}
    TextureSize texture_size(u32 t)override{if(!t)return {};const auto& s=images[(t-1)%2048];u32 w=1,h=1;while(w<s.width)w*=2;while(h<s.height)h*=2;return {w,h};}
    SpriteImage image(i16 n)override{return n>=0&&n<2048?images[u16(n)]:SpriteImage{};}
    void draw(u32 t,Topology p,const ScreenVertex* v,u32 n)override{draws.push_back({t,p,state,{v,v+n}});}
    void clear_depth()override{depthClears++;}
};
static BackgroundStage background;static BackgroundDrawCapture backgroundCapture;static ZunGraphics backgroundGraphics(backgroundCapture);static ImageRenderer backgroundImages(backgroundGraphics,backgroundCapture);
API(background_reset) void background_reset(u32 kind){background.reset(BackgroundKind(kind));backgroundCapture.state={};auto& p=backgroundCapture.state;p.blend=p.alphaTest=true;p.sourceBlend=BlendFactor::SourceAlpha;p.destinationBlend=BlendFactor::InverseSourceAlpha;p.depthTest=false;p.depthWrite=true;p.depthCompare=Compare::LessEqual;p.minFilter=p.magFilter=Filter::Nearest;for(u32 i=0;i<2048;i++)backgroundCapture.images[i]={i+1,256,256};}
API(background_image) void background_image(u32 n,u32 w,u32 h){if(n<2048)backgroundCapture.images[n]={n+1,w,h};}
API(background_values) const i32* background_values(){static std::array<i32,3> v;v={background.timer,background.animationFrame,background.secondaryTimer};return v.data();}
API(background_set) void background_set(i32 timer,i32 frame,i32 secondary){background.timer=timer;background.animationFrame=frame;background.secondaryTimer=secondary;}
API(background_advance) void background_advance(){background.advance();}
API(background_draw) void background_draw(u32 layer,float x,float y){CameraMotion camera;camera.x=x;camera.y=y;backgroundCapture.draws.clear();if(layer==0)background.render_back(backgroundImages,camera);else if(layer==1)background.render_middle(backgroundImages,camera);else background.render_front(backgroundImages,camera);}
API(background_draw_count) u32 background_draw_count(){return backgroundCapture.draws.size();}
API(background_draw_vertices) const ScreenVertex* background_draw_vertices(u32 index){return backgroundCapture.draws[index].vertices.data();}
API(background_draw_meta) const u32* background_draw_meta(u32 index){static std::array<u32,3> values;const auto& d=backgroundCapture.draws[index];values={d.texture?d.texture-1:0xffffffff,u32(d.topology),u32(d.vertices.size())};return values.data();}
API(background_draw_state) const u32* background_draw_state(u32 index){static std::array<u32,8> values;const auto& p=backgroundCapture.draws[index].state;values={u32(p.sourceBlend),u32(p.destinationBlend),u32(p.depthTest),u32(p.depthWrite),u32(p.depthCompare),u32(p.minFilter),u32(p.magFilter),u32(p.alphaTest)};return values.data();}
API(background_shadow) const float* background_shadow(){static std::array<float,9> values;const auto s=background.shadow_style();for(u32 i=0;i<3;i++){values[i]=s.scale[i];values[i+3]=s.rotation[i];values[i+6]=s.projection[i];}return values.data();}
API(background_shadow_color) u32 background_shadow_color(){return background.shadow_style().color;}
#include "../../cpp/game/BattleHud.hpp"
static BattleHud hud;
API(hud_number) void hud_number(float x,float y,u32 color,i32 value,u32 style,i32 count){backgroundCapture.draws.clear();hud.number(backgroundImages,x,y,color,value,u8(style),count);}
API(hud_combo_load) void hud_combo_load(const u8* p){auto& s=hud.combos[0];s.hits=fixture_read<i16>(p,4);s.damage=fixture_read<i16>(p,6);s.rate=fixture_read<i16>(p,8);s.alpha=p[10];s.facing=i8(p[11]);s.wait=fixture_read<i16>(p,12);s.slideAngle=fixture_read<i16>(p,14);s.slide=fixture_read<float>(p,16);}
API(hud_combo_update) void hud_combo_update(i32 hits,i32 damage,i32 rate){hud.combos[0].update(i16(hits),i16(damage),i16(rate));}
API(hud_combo_draw) void hud_combo_draw(){backgroundCapture.draws.clear();hud.render_combo(backgroundImages,hud.combos[0]);}
API(hud_combo_state) const u8* hud_combo_state(){static std::array<u8,20> p{};const auto& s=hud.combos[0];const auto put=[&](u32 at,const auto& value){std::memcpy(p.data()+at,&value,sizeof(value));};put(4,s.hits);put(6,s.damage);put(8,s.rate);p[10]=s.alpha;p[11]=u8(s.facing);put(12,s.wait);put(14,s.slideAngle);put(16,s.slide);return p.data();}
API(hud_banner_draw) void hud_banner_draw(i32 round,i32 timer){hud.bonusNumber=round;hud.bannerTimer=timer;backgroundCapture.draws.clear();hud.render_bonus_banner(backgroundImages);}
static std::array<FighterActor,2> hudActors;static BattleHudView hudView;
struct HudBankResources:SpriteResources {u32 offset=0;SpriteImage image(i16 index)override{auto value=backgroundCapture.image(index);if(value.texture)value.texture+=offset;return value;}};
static std::array<HudBankResources,4> hudBanks;
static ImageRenderer hudFirstSprites(backgroundGraphics,hudBanks[0]),hudSecondSprites(backgroundGraphics,hudBanks[1]),hudFirstPortraits(backgroundGraphics,hudBanks[2]),hudSecondPortraits(backgroundGraphics,hudBanks[3]);
API(hud_separate_banks) void hud_separate_banks(u32 on){for(u32 i=0;i<4;i++)hudBanks[i].offset=on?(i+1)*2048:0;}

API(hud_actor_load) void hud_actor_load(u32 side,const u8* p){actor_load(p,1);hudActors[side&1]=actorFixture;hudView.fighters={&hudActors[0],&hudActors[1]};}
API(hud_scene_load) void hud_scene_load(const u8* p,const i32* v){hudView.slide=fixture_read<float>(p,0x8c);hudView.healthFade={p[0x98],p[0x99]};hudView.phase=BattlePhase(p[0x18]);hudView.paused=p[0xa0]!=0;hudView.pauseFade=p[0xa1];hudView.pauseChoice=i8(p[0x118]);hudView.mode=GameMode(v[0]);hudView.replayMode=u8(v[1]);hudView.hudAlpha={u8(v[2]),u8(v[3])};hudView.highScore=u32(v[4]);hudView.remainingLives=i8(v[5]);hudView.continueCredits=i8(v[6]);hudView.continued=v[7]!=0;hud.reset();}
API(hud_status_draw) void hud_status_draw(){backgroundCapture.draws.clear();hud.render_status(backgroundImages,hudFirstSprites,hudSecondSprites,hudView);}
API(hud_pause_draw) void hud_pause_draw(){backgroundCapture.draws.clear();hud.render_pause_menu(backgroundImages,hudFirstPortraits,hudSecondPortraits,hudView);}

API(hud_spells_draw) void hud_spells_draw(u32 difficulty){backgroundCapture.draws.clear();hud.render_spells(backgroundImages,hudFirstSprites,hudSecondSprites,hudView,roundRules,u8(difficulty));}
API(hud_card_attempts) void hud_card_attempts(u32 card,i32 attempts){roundRules.storyCards[card].attempts=i16(attempts);}
#include "../../cpp/game/BattleOverlay.hpp"
static BattleOverlay overlayFixture;static std::array<u8,0x90> overlayFixtureBytes;
API(overlay_load) void overlay_load(const u8* p){std::memcpy(overlayFixtureBytes.data(),p,overlayFixtureBytes.size());overlayFixture.timer=fixture_read<i32>(p,0x60);overlayFixture.frame=fixture_read<i32>(p,0x10);overlayFixture.kind=p[0x64];overlayFixture.horizontal=fixture_read<float>(p,0x70);overlayFixture.vertical=fixture_read<float>(p,0x74);overlayFixture.label=fixture_read<float>(p,0x78);overlayFixture.secondaryLabel=fixture_read<float>(p,0x7c);overlayFixture.pulse=fixture_read<float>(p,0x80);overlayFixture.pulseVelocity=fixture_read<float>(p,0x84);overlayFixture.ring=fixture_read<float>(p,0x88);}
API(overlay_advance) void overlay_advance(){overlayFixture.advance();}
API(overlay_draw) void overlay_draw(){backgroundCapture.draws.clear();overlayFixture.render(backgroundImages);}
API(overlay_state) const u8* overlay_state(){auto& p=overlayFixtureBytes;const auto put=[&](u32 at,const auto& v){std::memcpy(p.data()+at,&v,sizeof(v));};put(0x60,overlayFixture.timer);put(0x70,overlayFixture.horizontal);put(0x74,overlayFixture.vertical);put(0x78,overlayFixture.label);put(0x7c,overlayFixture.secondaryLabel);put(0x80,overlayFixture.pulse);put(0x84,overlayFixture.pulseVelocity);put(0x88,overlayFixture.ring);return p.data();}

#include "../../cpp/game/BattlePortraits.hpp"
API(hud_portrait_draw) void hud_portrait_draw(u32 side,u32 operation,i32 image,float slide,float y,u32 color){backgroundCapture.draws.clear();if(operation==0)render_story_portrait(backgroundImages,hudActors[side]);else if(operation==1)render_fade_portrait(backgroundImages,hudActors[side]);else render_victory_portrait(backgroundImages,hudActors[side],i16(image),slide,y,color);}
static std::array<PatternFrame,2> markerFrames;
API(hud_collision_flags) void hud_collision_flags(u32 side,u32 flags){markerFrames[side].flags[0]=flags;hudActors[side].collision.frame=&markerFrames[side];}
API(hud_recovery_draw) void hud_recovery_draw(float x,float y){backgroundCapture.draws.clear();CameraMotion camera;camera.x=x;camera.y=y;render_recovery_markers(backgroundImages,hudView,camera);}

#include "../../cpp/game/BattleRenderOrder.hpp"
struct RenderOrderCapture final:BattleDrawCommands {
    std::vector<u32> events;
    void note(u32 event,u32 side=0,u32 layer=0){const auto bits=[](float f){u32 n;std::memcpy(&n,&f,4);return n;};const auto& g=backgroundGraphics;const auto& p=backgroundCapture.state;events.insert(events.end(),{event,side,layer,bits(g.drawScale),bits(g.originX),bits(g.originY),bits(g.colorMultiplier),u32(p.depthTest),u32(p.depthWrite)});}
    void background_back()override{note(1);}void background_middle()override{note(2);}void background_front()override{note(3);}
    void object_shadows(u8 side)override{note(4,side);}void fighter_shadow(u8 side)override{note(5,side);}void owned_objects(u8 side,u8 layer)override{note(6,side,layer);}void trails(u8 side)override{note(7,side);}void shared_effects(u8 layer)override{note(8,0,layer);}void fighter(u8 side)override{note(9,side);}void character_special(u8 side)override{note(10,side);}void recovery_markers()override{note(11);}void status()override{note(12);}void fade_portrait(u8 side)override{note(13,side);}void spells()override{note(14);}void victory()override{note(15);}void story_portrait(u8 side)override{note(16,side);}void dialogue()override{note(17);}void story_caption()override{note(18);}void battle_overlay()override{note(19);}void bonus_banner()override{note(20);}void pause_menu()override{note(21);}void fps()override{note(22);}
};
static RenderOrderCapture renderOrderFixture;
API(render_order) void render_order(const u8* p,const u8* a,const u8* b,const u32* values,float span){BattleDrawingState v;v.cameraSpan=span;v.sceneFade=fixture_read<float>(p,0x9c);v.phase=BattlePhase(p[0x18]);v.stageEnabled=values[0]!=0;v.recoveryMarkers=values[1]!=0;v.foreground=u8(values[2]);v.fadeAlpha=u8(values[3]);v.fadeColor=values[4];v.fighterFade={a[0x538],b[0x538]};v.portrait={i8(a[0x6e7]),i8(b[0x6e7])};v.firstPortraitFront=a[0x6e8]!=0;v.dialogueVisible=a[0x6ee]!=0;v.overlay=fixture_read<i32>(p,0x60)>0;v.bonus=fixture_read<i32>(p,0x6c)>0;v.pause=p[0xa1]!=0;renderOrderFixture.events.clear();backgroundCapture.draws.clear();render_battle_layers(backgroundGraphics,v,renderOrderFixture);}
API(render_order_events) const u32* render_order_events(){return renderOrderFixture.events.data();}
API(render_order_event_count) u32 render_order_event_count(){return renderOrderFixture.events.size();}

#include "../../cpp/game/CharacterSelectScene.hpp"
static CharacterSelectScene selectFixture;static GameSelection selectConfig;static SelectionSettings selectSettings;static SelectionProgress selectProgress;static ReplayRandom selectRandom;static std::array<u8,0x100> selectRaw;
struct SelectSignalCapture final:CharacterSelectSignals {std::vector<i32> events;void sound(u16 n)override{events.insert(events.end(),{1,n});}void render_selection()override{events.push_back(2);}void present_selection()override{events.push_back(3);}void fade_music(i32 a,i32 b,u32 c,u32 d)override{events.insert(events.end(),{4,a,b,i32(c),i32(d)});}void prepare_battle()override{events.push_back(5);}};
static SelectSignalCapture selectSignals;
static void select_fixture_fields(bool load){const auto field=[&](u32 at,auto& v){if(load)std::memcpy(&v,selectRaw.data()+at,sizeof(v));else std::memcpy(selectRaw.data()+at,&v,sizeof(v));};
#include "select-state-fields.inc"
for(u32 side=0;side<2;side++)field(12+side*28,selectFixture.inputs[side].counts);}
API(select_load) void select_load(const u8* p,const u8* v,const u8* progress,u32 seed){std::memcpy(selectRaw.data(),p,selectRaw.size());select_fixture_fields(true);selectFixture.hardwareCancel={selectFixture.inputs[0].counts[3],selectFixture.inputs[1].counts[3]};selectConfig.mode=GameMode(v[0]);selectConfig.activePlayer=v[1];selectConfig.character={v[2],v[3]};selectConfig.alternatePalette={v[4],v[5]};selectConfig.firstSpell={v[6],v[7]};selectConfig.secondSpell={v[8],v[9]};selectConfig.background=v[10];selectConfig.difficulty=v[11];selectConfig.storyStage=v[12];selectConfig.startingStage=v[13];selectConfig.resumeStory=v[14]!=0;selectSettings.handicap={v[16],v[17]};selectSettings.easyCommands={v[18],v[19]};selectProgress.character=v[20];selectProgress.difficulty=v[21];std::memcpy(selectProgress.storyStages.data(),progress,44);selectRandom.state=seed;selectSignals.events.clear();}
API(select_state) const u8* select_state(){select_fixture_fields(false);return selectRaw.data();}
API(select_globals) const u8* select_globals(){static std::array<u8,22> v{};v[0]=u8(selectConfig.mode);v[1]=selectConfig.activePlayer;for(u32 side=0;side<2;side++){v[2+side]=selectConfig.character[side];v[4+side]=selectConfig.alternatePalette[side];v[6+side]=selectConfig.firstSpell[side];v[8+side]=selectConfig.secondSpell[side];v[16+side]=selectSettings.handicap[side];v[18+side]=selectSettings.easyCommands[side];}v[10]=selectConfig.background;v[11]=selectConfig.difficulty;v[12]=selectConfig.storyStage;v[13]=selectConfig.startingStage;v[14]=selectConfig.resumeStory;v[20]=selectProgress.character;v[21]=selectProgress.difficulty;return v.data();}
API(select_apply) u32 select_apply(u32 operation,u32 side){selectSignals.events.clear();switch(operation){case 0:selectFixture.choose_character(side,selectConfig,selectSettings,selectProgress,selectRandom,selectSignals);break;case 1:selectFixture.choose_first_spell(side,selectConfig,selectSettings,selectProgress,selectRandom,selectSignals);break;case 2:selectFixture.choose_second_spell(side,selectConfig,selectSettings,selectProgress,selectRandom,selectSignals);break;case 3:selectFixture.choose_background(side,selectConfig,selectSettings,selectProgress,selectRandom,selectSignals);break;case 4:selectFixture.finish_selection(side,selectConfig,selectSettings,selectProgress,selectRandom,selectSignals);break;case 5:selectFixture.player_options(side,selectConfig,selectSettings,selectProgress,selectRandom,selectSignals);break;case 6:selectFixture.story_options(selectConfig,selectSettings,selectProgress,selectRandom,selectSignals);break;case 7:selectFixture.reset(selectConfig,selectProgress);break;default:return selectFixture.advance(selectConfig,selectSettings,selectProgress,selectRandom,selectSignals);}return 0;}
API(select_events) const i32* select_events(){return selectSignals.events.data();}API(select_event_count) u32 select_event_count(){return selectSignals.events.size();}API(select_random_state) u32 select_random_state(){return selectRandom.state;}
API(select_unlocks) const u8* select_unlocks(const u8* flags){SelectionUnlocks u;std::memcpy(u.storyFlags.data(),flags,256);static std::array<u8,60> out;for(u32 i=0;i<15;i++){out[i]=u.character_available(i8(i),false);out[15+i]=u.character_available(i8(i),true);}for(u32 i=0;i<30;i++)out[30+i]=u.background_available(i8(i));return out.data();}

struct SelectionImages final:SpriteResources{u32 offset;explicit SelectionImages(u32 v):offset(v){}SpriteImage image(i16 n)override{return backgroundCapture.image(i16(n+offset));}};
static SelectionImages selectCharacterImages(64),selectBackgroundImages(128);static ImageRenderer selectCharacters(backgroundGraphics,selectCharacterImages),selectBackgrounds(backgroundGraphics,selectBackgroundImages);
API(select_render) void select_render(u32 op){backgroundCapture.draws.clear();if(op==0)selectFixture.render(backgroundImages,selectCharacters,selectBackgrounds,selectConfig,selectSettings,selectProgress);else if(op==1)selectFixture.render_spells(backgroundImages,selectCharacters,selectBackgrounds,selectConfig,selectSettings,selectProgress);else if(op==2)selectFixture.render_options(backgroundImages,selectCharacters,selectBackgrounds,selectConfig,selectSettings,selectProgress);else selectFixture.render_story_options(backgroundImages,selectCharacters,selectBackgrounds,selectConfig,selectSettings,selectProgress);}

#include "menus-fixture.inc"

#include "profile-fixture.inc"

#include "loading-fixture.inc"

#include "assets-fixture.inc"

#include "cinema-fixture.inc"

#include "presentation-fixture.inc"

#include "../../cpp/game/VictoryDialogue.hpp"
static RoundFighterState victoryFixture;static ReplayRandom victoryRandom;
API(victory_select) u32 victory_select(u32 opponent,u32 seed){victoryRandom.state=seed;select_victory_dialogue(victoryFixture,story,u8(opponent),victoryRandom);return victoryFixture.victoryLines.size();}
API(victory_text) const char* victory_text(u32 i){return victoryFixture.victoryLines.at(i).c_str();}
API(victory_face) i32 victory_face(u32 i){return victoryFixture.victoryPortraits.at(i);}
API(victory_rng) u32 victory_rng(){return victoryRandom.state;}

#include "recorded-match-fixture.inc"
