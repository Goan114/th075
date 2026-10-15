#include "../../cpp/game/GameProfile.hpp"
static GameProfile profileFixture;static std::vector<u8> profileBytes;static ReplayRandom profileRandom;
API(profile_default) void profile_default(){profileFixture=GameProfile();}
API(profile_load) u32 profile_load(const void* p,u32 n){return profileFixture.load(p,n);}
API(profile_encode) const u8* profile_encode(){profileBytes=profileFixture.encode();return profileBytes.data();}
API(profile_save) const u8* profile_save(u32 seed){profileRandom.state=seed;profileBytes=profileFixture.save(profileRandom);return profileBytes.data();}
API(profile_rng) u32 profile_rng(){return profileRandom.state;}
API(profile_select) void profile_select(u32 ch,u32 difficulty){profileFixture.select(ch,difficulty);}
API(profile_rank) u32 profile_rank(u32 score,u32 month,u32 day){return profileFixture.selected().insert_score(score,month,day);}
API(profile_stage) void profile_stage(u32 stage){profileFixture.complete_stage(stage);}
API(profile_begin) void profile_begin(){profileFixture.begin_attempt();}
API(profile_unlock) void profile_unlock(i32 id){profileFixture.unlock(i16(id));}
API(profile_unlocked) u32 profile_unlocked(i32 id){return profileFixture.unlocked(i16(id));}
