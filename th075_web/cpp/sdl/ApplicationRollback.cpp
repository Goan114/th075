#include "RollbackState.hpp"
namespace th075::sdl {
std::unique_ptr<RollbackState> Application::capture_rollback()const{return battle&&battleRenderer?std::make_unique<RollbackState>(*this):nullptr;}
bool Application::restore_rollback(const RollbackState& state){if(!battle||!battleRenderer||sceneCode!=0)return false;state.restore(*this);return true;}
bool Application::rollback_predictable()const{return sceneCode==0&&battle&&battle->simulation.rules.phase==BattlePhase::Active&&!battle->progress.paused&&!battle->progress.pauseFade;}
}
