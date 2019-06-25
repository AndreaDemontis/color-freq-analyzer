#pragma once
#include <nan.h>

extern "C"
{
	#include <libavutil/time.h>
	#include <libswscale/swscale.h>
	#include <libavcodec/avcodec.h>
	#include <libavformat/avformat.h>
}

class Codec : public Nan::ObjectWrap
{

public:

	static NAN_MODULE_INIT(Init);
	static NAN_METHOD(New);

	static NAN_GETTER(HandleGetters);
	static NAN_SETTER(HandleSetters);

	static Nan::Persistent<v8::Function> constructor;
    static v8::Local<v8::Object> NewObject(AVCodecContext *stream);

    AVCodecContext * getCodecContext();

private:

	explicit Codec();
	~Codec();

private:

	// - FFmpeg codec
	AVCodecContext *pCodec;
};
