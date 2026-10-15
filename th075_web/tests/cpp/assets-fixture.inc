#include "../../cpp/game/GameResources.hpp"
#include "../../cpp/game/TextRaster.hpp"
static SoundPack soundFixture;
API(sound_pack_load) u32 sound_pack_load(const void* p,u32 n){return soundFixture.load(p,n);}
API(sound_pack_count) u32 sound_pack_count(){return soundFixture.samples.size();}
API(sound_pack_present) u32 sound_pack_present(u32 i){return soundFixture.samples[i].present;}
API(sound_pack_pcm) const u8* sound_pack_pcm(u32 i){return soundFixture.samples[i].pcm.data();}
API(sound_pack_size) u32 sound_pack_size(u32 i){return soundFixture.samples[i].pcm.size();}
API(sound_pack_format) const u8* sound_pack_format(u32 i){return reinterpret_cast<const u8*>(&soundFixture.samples[i].format);}
API(music_loop) const u32* music_loop(const void* p,u32 n,i32 cue){static std::array<u32,2> v;const auto loop=original_music_loop(p,n,i16(cue));v={loop.endBytes,loop.lengthBytes};return v.data();}
static GlyphBank glyphFixture;static std::vector<u8> rasterFixture;
API(glyph_bank_load) u32 glyph_bank_load(const void* p,u32 n){return glyphFixture.load(p,n);}
API(text_raster) u32 text_raster(const char* p,u32 n,u32 width,u32 height,u32 wrap,i32 spacing,i32 lines,u32 font,u32 color,u32 limit,u32 format){TextRasterOptions o;o.width=width;o.height=height;o.wrapWidth=wrap;o.characterSpacing=spacing;o.lineSpacing=lines;o.fontHeight=font;o.red=color>>16;o.green=color>>8;o.blue=color;o.lineLimit=limit;o.bytesPerPixel=format;TextRaster raster(glyphFixture);return raster.render(std::string(p,p+n),o,rasterFixture);}
API(text_pixels) const u8* text_pixels(){return rasterFixture.data();}
API(text_size) u32 text_size(){return rasterFixture.size();}
