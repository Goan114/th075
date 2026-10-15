#pragma once
#include "../game/GameResources.hpp"
namespace th075::sdl {
class FileResources final:public ResourceStore {
public:
 std::string error;
 bool read(ResourceEdition,const std::string&,std::vector<u8>&)override;
 static bool chinese();
 static bool read_file(const std::string&,std::vector<u8>&,u32 limit=134217728);
 static bool write_file(const std::string&,const void*,u32);
};
}
