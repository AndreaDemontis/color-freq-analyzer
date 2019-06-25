#pragma once
#include <nan.h>

extern "C"
{
	#include <libavutil/time.h>
	#include <libswscale/swscale.h>
	#include <libavcodec/avcodec.h>
	#include <libavformat/avformat.h>
}

class Video : public Nan::ObjectWrap
{

public:

	static NAN_MODULE_INIT(Init);
	static NAN_METHOD(New);
	static NAN_METHOD(Load);
	static NAN_METHOD(GetReader);

	static NAN_GETTER(HandleGetters);
	static NAN_SETTER(HandleSetters);

	static Nan::Persistent<v8::FunctionTemplate> constructor;

	std::string getFilePath();

private:

	explicit Video(std::string path);
	~Video();

private:

	// - File path
	std::string pFilePath;

	// - FFmpeg video
	AVFormatContext *pFormatCtx;
};
