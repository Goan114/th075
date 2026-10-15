// Real recorded-match logic fixture. Rendering/audio are excluded; scene camera
// and all battle input, action, object, collision, round and replay code run.
#include "../../cpp/game/BattleScene.hpp"
static std::array<FighterPattern,2> matchPatterns;
static BattleLoading matchLoading;static ReplayFile matchFile;static std::unique_ptr<BattleScene> matchBattle;
struct MatchPlatform final:BattleScenePlatform,BattleLoadSignals,FighterCoreEvents {
 void sound(i16)override{}void combo(u8,i16,i16,i32)override{}void spell_attempt(u8,u8)override{}void advance_stage()override{}
 void toggle_fullscreen()override{}void render_battle(BattleScene&,bool)override{}void present_battle()override{}
 void begin_round_recording()override{}void banner(bool)override{}void fade_music(i32,i32,u32,u32)override{}void stop_music(i32)override{}void finish_replay_round()override{}
 void dialogue_origin(float,float,u32)override{}void prepare_victory(RoundFighterState&)override{}void show_victory_line(const std::string&,u8)override{}void end_story_dialogue()override{}
 void render_before_story_load()override{}void release_battle_loader()override{}void stage_story_completed()override{}void reset_fighter(u32,RoundFighterState&)override{}void reset_stage_effects()override{}void advance_overlay()override{}
 bool load_character(u8 side,const CharacterDefinition&,u8,CharacterController& c)override{c.actor.animation.pattern=&matchPatterns[side];return true;}
 void load_story_artwork(CharacterController&,u8)override{}FighterCoreEvents& reset_events(u8)override{return *this;}void save_profile(const std::vector<u8>&)override{}
 void prepare_round_recording(const GameSelection&,const BattleSession&,const RoundRules&,const FighterActor&)override{}
 void clear_owned_objects(FighterActor&)override{}void spell_attempt(u8)override{}void reset_hud_alpha()override{}
};static MatchPlatform matchPlatform;
API(match_pattern) u32 match_pattern(u32 side,const void* p,u32 n){return matchPatterns.at(side).load(p,n);}
API(match_begin) u32 match_begin(const void* p,u32 n){matchBattle.reset();matchLoading.characters={};matchLoading.story={};if(!matchFile.load(p,n)||matchFile.header[13]!=0)return 0;GameSelection sel;SelectionSettings options;RoundRules rules;ReplayStreams replay;GameSettings settings;GameProfile profile;BattleSession session;session.replayMode=2;session.roundIndex=1;session.replayRound=i8(matchFile.rounds.size());if(!ReplayConfiguration::load(matchFile,0,sel,options,rules,replay))return 0;if(!matchLoading.load(sel,settings,options,profile,replay,session,rules,matchPlatform))return 0;matchBattle=std::make_unique<BattleScene>(matchLoading.controllers(),effects,matchPlatform);matchBattle->initialize(session);matchBattle->simulation.story=matchLoading.story;matchBattle->simulation.replay=replay;matchBattle->simulation.replayMode=2;matchBattle->simulation.difficulty=sel.difficulty;matchBattle->simulation.rules.countdown=200;return 1;}
API(match_tick) u32 match_tick(){return u32(matchBattle->advance({},storyEventCapture));}
// Enter a final-hit recovery through the real character and round loop.
API(match_knockdown) void match_knockdown(u32 side,u32 story){if(story){matchBattle->session.mode=GameMode::Story;matchBattle->simulation.mode=GameMode::Story;}auto& a=matchLoading.characters.at(side)->actor;a.combat.health=0;a.combat.spellPhase=2;a.select_action(97);a.motion.y=40;a.motion.velocityX=0;a.motion.velocityY=-2;matchBattle->simulation.rules.phase=BattlePhase::Active;matchBattle->simulation.rules.countdown=0;}
API(match_next_input) void match_next_input(u32 first,u32 second){auto& r=matchBattle->simulation.replay;const auto i=r.inputCursor;if(r.round&&i+1<r.round->playerInputs.size()){r.round->playerInputs[i]=u8(first);r.round->playerInputs[i+1]=u8(second);}}
API(match_actor) const u8* match_actor(u32 side){actorFixture=matchLoading.characters.at(side)->actor;actorRaw.fill(0);actor_fixture_fields(false);return actorRaw.data();}
API(match_scene) const u8* match_scene(){roundRules=matchBattle->simulation.rules;return round_scene_snapshot();}
API(match_state) const u32* match_state(){static std::array<u32,12> v;const auto& b=*matchBattle;const auto& r=b.simulation.replay;v={b.timing.frame,b.timing.replayFrame,u32(b.simulation.rules.phase),u32(b.simulation.rules.countdown),u32(r.inputCursor),u32(r.randomCursor),u32(r.auxiliaryCursor),u32(r.eventCursor),r.random.state,u32(r.exhausted),u32(b.simulation.objects[0].size(0)+b.simulation.objects[0].size(1)+b.simulation.objects[0].size(2)+b.simulation.objects[0].size(3)),u32(b.simulation.objects[1].size(0)+b.simulation.objects[1].size(1)+b.simulation.objects[1].size(2)+b.simulation.objects[1].size(3))};return v.data();}
