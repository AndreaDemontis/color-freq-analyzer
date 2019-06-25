#pragma once
#include <string>

extern "C"
{
	#include <libavutil/time.h>
	#include <libswscale/swscale.h>
	#include <libavcodec/avcodec.h>
	#include <libavformat/avformat.h>
}

#define ACCESSOR(CTOR, NAME, GETTER, SETTER) Nan::SetAccessor(CTOR->InstanceTemplate(), Nan::New(NAME).ToLocalChecked(), GETTER, SETTER)
#define THROW(MESSAGE) Nan::ThrowError(Nan::New(MESSAGE).ToLocalChecked());

std::string camelCase(std::string const& );
std::string getSampleFormatId(int );
std::string getPixelFormatId(int );
std::string channelLayoutId(int );
std::string getColorSpaceId(int );
std::string getCodecId(int );

AVPixelFormat pixelFormatFromString(std::string );

typedef struct
{
	void * self;
    int height;
    int width;
    int format;
    int index;
    bool keyFrame;
    double time;
    int quality;
	size_t bufferSize;
    uint8_t * buffer;
} VideoFrame;
