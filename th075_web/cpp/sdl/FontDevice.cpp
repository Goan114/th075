#include "FontDevice.hpp"
#include "FileResources.hpp"
#include <cstdio>
namespace th075::sdl {
bool FontDevice::initialize(){std::vector<u8> b;if(!FileResources::read_file("/fonts/original-glyphs.bin",b)||!bank.load(b.data(),b.size())){error="Original font bank unavailable: "+bank.error;return false;}std::remove("/fonts/original-glyphs.bin");useChinese=FileResources::chinese();if(useChinese){if(!FileResources::read_file("/fonts/chinese-glyphs.bin",b)||!chineseBank.load(b.data(),b.size())){error="Chinese font bank unavailable: "+chineseBank.error;return false;}std::remove("/fonts/chinese-glyphs.bin");}return true;}
u32 FontDevice::create(const std::string& text,const TextRasterOptions& options){const u32 handle=graphics.create_surface(options.width,options.height);if(!handle)return 0;if(!write(handle,text,options)){graphics.destroy(handle);return 0;}return handle;}
bool FontDevice::write(u32 handle,const std::string& text,const TextRasterOptions& options){std::vector<u8> pixels;TextRaster raster(bank,useChinese?&chineseBank:nullptr);if(options.bytesPerPixel!=4||!raster.render(text,options,pixels)){error=raster.error;return false;}if(!graphics.update_pixels(handle,pixels.data(),u32(pixels.size()))){error="Unable to update text surface";return false;}return true;}
}
