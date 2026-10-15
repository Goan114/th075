#include "../../cpp/game/CinemaScene.hpp"
#include "../../cpp/game/TextSurface.hpp"
static CinemaScene cinemaFixture;static TextSurface textSurfaceFixture;
API(cinema_draw) void cinema_draw(u32 credits,u32 elapsed){cinemaFixture.credits=credits;cinemaFixture.elapsed=elapsed;backgroundCapture.draws.clear();cinemaFixture.render(backgroundImages);}
API(text_surface_draw) void text_surface_draw(const u8* p){textSurfaceFixture.x=fixture_read<float>(p,4);textSurfaceFixture.y=fixture_read<float>(p,8);textSurfaceFixture.fade=p[12];textSurfaceFixture.scaleY=fixture_read<float>(p,16);textSurfaceFixture.previousParts=p[21];textSurfaceFixture.fontHeight=p[36];textSurfaceFixture.window=p[37];backgroundCapture.draws.clear();textSurfaceFixture.render(backgroundImages,501);}
API(text_surface_result) const u8* text_surface_result(){static std::array<u8,8> p{};p[0]=textSurfaceFixture.fade;std::memcpy(p.data()+4,&textSurfaceFixture.scaleY,4);return p.data();}
