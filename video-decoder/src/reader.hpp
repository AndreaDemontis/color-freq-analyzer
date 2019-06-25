#pragma once
#include <condition_variable>
#include <nan.h>
#include <mutex>
#include <list>

#include "worker.h"
#include "video.hpp"
#include "utils.hpp"
#include "semaphore.hpp"

extern "C"
{
	#include <libavutil/time.h>
	#include <libswscale/swscale.h>
	#include <libavcodec/avcodec.h>
	#include <libavformat/avformat.h>
}

typedef std::function<void(const char *data, size_t size)> ProcessCallback;

class Reader : public Nan::ObjectWrap
{

public:

	static NAN_MODULE_INIT(Init);
	static NAN_METHOD(Initialize);
	static NAN_METHOD(Process);
	static NAN_METHOD(Closed);
    static NAN_METHOD(New);

	static NAN_METHOD(TogglePause);
	static NAN_METHOD(PrevFrame);
    static NAN_METHOD(NextFrame);
    static NAN_METHOD(Close);
    static NAN_METHOD(Seek);

	static NAN_GETTER(HandleGetters);
	static NAN_SETTER(HandleSetters);

	static Nan::Persistent<v8::Function> constructor;
    static v8::Local<v8::Object> NewObject(Video *);

private:

	explicit Reader();
	~Reader();

private:

	// - File path
	std::string pFilePath;

	// - FFmpeg video
	AVFormatContext *pFormatCtx;

    // - Threading
	void pProcess(ProcessCallback &);
    Worker   * pDecoderWorker = NULL;
	bool 	   pCanRun = true;
	Semaphore  pRendering;
	std::mutex pMutex;
	std::condition_variable pCondVar;

    // - Settings
	AVPixelFormat pPixelFormat = AV_PIX_FMT_NONE;
	bool pResetDecoder = true;
	bool pDisableTiming = false;
	int  pSelectedStream = -1;
	int  pRequestHeight = -1;
	int  pRequestWidth = -1;

	// - Decoder
	SwsContext		* pVideoResampler = NULL;
	AVCodecContext 	* pCodecCtx = NULL;
	AVCodec 		* pCodec = NULL;

	// - Video
	std::list<VideoFrame*> pFrameBuffer;
	std::list<VideoFrame*>::iterator pCurrentFrame;
	int    pBufferSize = 30;
	double pSeekRequest = -1;
	double pSeekFrame = 0;
	bool   pPause = true;

};
