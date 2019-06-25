#include <nan.h>
#include "video.hpp"
#include "stream.hpp"
#include "codec.hpp"
#include "reader.hpp"

NAN_MODULE_INIT(InitModule)
{
	Reader::Init(target);
	Codec::Init(target);
	Stream::Init(target);
	Video::Init(target);
}

NODE_MODULE(myModule, InitModule);
