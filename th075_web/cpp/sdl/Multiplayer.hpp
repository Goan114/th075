#pragma once
#include "../game/BattleControls.hpp"
namespace th075::sdl::multiplayer {
bool active();
bool pump(double nowUs);
bool step(const BattleSystemInput&,double nowUs);
double pace(double elapsedMs);
void render();
}
