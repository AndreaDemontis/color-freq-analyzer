#include "reader.hpp"

#include <regex>
#include <cstdint>

#define TIMESTAMP(FRAME) av_frame_get_best_effort_timestamp(FRAME)

using namespace std;
using namespace std::placeholders;

Nan::Persistent<v8::Function> Reader::constructor;

Reader::Reader() : pFormatCtx(NULL)
{

}

Reader::~Reader()
{
	pCanRun = false;
}

NAN_MODULE_INIT(Reader::Init)
{
	auto ctor = Nan::New<v8::FunctionTemplate>(Reader::New);

	ctor->InstanceTemplate()->SetInternalFieldCount(1);
	ctor->SetClassName(Nan::New("Reader").ToLocalChecked());

	// - Link our getters and setter to the object property

	// - Define all methods
	Nan::SetPrototypeMethod(ctor, "initialize", Initialize);
    Nan::SetPrototypeMethod(ctor, "togglePause", TogglePause);
	Nan::SetPrototypeMethod(ctor, "prevFrame", PrevFrame);
	Nan::SetPrototypeMethod(ctor, "nextFrame", NextFrame);
	Nan::SetPrototypeMethod(ctor, "process", Process);
	Nan::SetPrototypeMethod(ctor, "close", Close);
    Nan::SetPrototypeMethod(ctor, "seek", Seek);

	constructor.Reset(Nan::GetFunction(ctor).ToLocalChecked());

	target->Set(Nan::New("Reader").ToLocalChecked(), ctor->GetFunction());
}

NAN_METHOD(Reader::New)
{
	// - Throw an error if constructor is called without new keyword
	if(!info.IsConstructCall())
		return THROW("Reader::New - called without new keyword");

	// - Expect exactly 1 arguments
	if(info.Length() != 0)
		return THROW("Reader::New - expected arguments filePath");

	// - Create a new instance and wrap our javascript instance
	Reader* obj = new Reader();
	obj->Wrap(info.Holder());

	// - Return the wrapped javascript instance
	info.GetReturnValue().Set(info.Holder());
}

v8::Local<v8::Object> Reader::NewObject(Video *video)
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Function> cons = Nan::New(constructor);
    auto instance = Nan::NewInstance(cons).ToLocalChecked();

    // - Set internal data
    Reader* obj = Nan::ObjectWrap::Unwrap<Reader>(instance);
    obj->pFilePath = video->getFilePath();

    return scope.Escape(instance);
}

NAN_METHOD(Reader::Initialize)
{
	Nan::HandleScope scope;

	// unwrap this Reader
	Reader * self = Nan::ObjectWrap::Unwrap<Reader>(info.This());

	// - Arguments
	AVPixelFormat format = AV_PIX_FMT_NONE;
	bool disableTiming = false;
	int  width = -1;
	int  height = -1;


	// - Argument 0
	if (info.Length() >= 1)
	{
		if (!info[0]->IsBoolean())
			return THROW("Reader::Initialize - expected first argument to be a boolean");

		disableTiming = info[0]->BooleanValue();
	}

	// - Argument 1
	if (info.Length() >= 2)
	{
		if (!info[1]->IsString())
			return THROW("Reader::Initialize - expected second argument to be a string");

		v8::String::Utf8Value formatString(info[1]->ToString());
		format = pixelFormatFromString(std::string(*formatString));
	}

	// - Argument 2
	if (info.Length() >= 3)
	{
		if (!info[2]->IsNumber())
			return THROW("Reader::Initialize - expected third argument to be a integer");

		width = info[2]->Uint32Value();
	}

	// - Argument 3
	if (info.Length() >= 4)
	{
		if (!info[3]->IsNumber())
			return THROW("Reader::Initialize - expected forth argument to be a integer");

		height = info[3]->Uint32Value();
	}

	// - Set parameters
	self->pDisableTiming = disableTiming;
	self->pPixelFormat = format;
	self->pRequestHeight = height;
	self->pRequestWidth = width;

	// - Threaded process callback
    auto bindedFunc = std::bind(&Reader::pProcess, self, _1);
    auto processFunc = new Worker::ExecutionCallback(bindedFunc);

	// - JS process end callback
	auto endFuncTemp = Nan::New<v8::FunctionTemplate>(Reader::Closed, info.This());
	auto func = Nan::GetFunction(endFuncTemp).ToLocalChecked();
	auto endFunc = new Nan::Callback(func);

	// - JS process proggress callback
	auto procFuncTemp = Nan::New<v8::FunctionTemplate>(Reader::Process, info.This());
	auto procFunc = new Nan::Callback(Nan::GetFunction(procFuncTemp).ToLocalChecked());

	// - Start async process
    self->pDecoderWorker = new Worker(endFunc, procFunc, processFunc);
	AsyncQueueWorker(self->pDecoderWorker);
}

void Reader::pProcess(ProcessCallback &callback)
{
	int res = 0;

    // - Alloc a new context
	if (!(pFormatCtx = avformat_alloc_context()))
	{
		// - Send error to node.
		return;
	}

	// - Load the source in the context
	if (avformat_open_input(&pFormatCtx, pFilePath.c_str(), nullptr, nullptr) < 0)
	{
		avformat_free_context(pFormatCtx);
		pFormatCtx = NULL;
		// - Send error to node.
		return;
	}

	// - Inject metadata
	av_format_inject_global_side_data(pFormatCtx);

	// - Get stream informations
	if(avformat_find_stream_info(pFormatCtx, nullptr) < 0)
	{
		avformat_close_input(&pFormatCtx);
		avformat_free_context(pFormatCtx);
		pFormatCtx = NULL;
		// - Send error to node.
		return;
	}

	// - Select default video stream
	if (pSelectedStream < 0)
	{
		for (size_t i = 0; i < pFormatCtx->nb_streams; i++)
		{
			if (pFormatCtx->streams[i]->codec->codec_type == AVMEDIA_TYPE_VIDEO)
			{
				pSelectedStream = i;
				break;
			}
		}

		if (pSelectedStream < 0)
		{
			avformat_close_input(&pFormatCtx);
			avformat_free_context(pFormatCtx);
			pFormatCtx = NULL;
			// - Send error to node.
			return;
		}
	}

	// - Gets the working stream
	AVStream * st = pFormatCtx->streams[pSelectedStream];

	// - Video timer
	double videoTimer = (double)(av_gettime() / 1000000.0);

	// - Flags
	bool videoEnd = false;
	bool readEnd = false;

    while(pCanRun)
    {
		// - Make decoder and set parameters
		if (pResetDecoder)
		{
			// - We wont an infinite reset loop
			pResetDecoder = false;

			// - Delete old instances
			if (pVideoResampler) sws_freeContext(pVideoResampler);
			if (pCodecCtx) avcodec_free_context(&pCodecCtx);
			pVideoResampler = NULL;

			// - Alloc a new video context
			pCodecCtx = avcodec_alloc_context3(nullptr);

			if (!pCodecCtx)
			{
				// - Send error to node.
				continue;
			}

			// - Set context data
			if (avcodec_parameters_to_context(pCodecCtx, st->codecpar) < 0)
			{
				avcodec_free_context(&pCodecCtx);
				pCodecCtx = NULL;
				// - Send error to node.
				continue;
			}

			// - Set context base time
			pCodecCtx->pkt_timebase = st->time_base;

			// - Get decoder for this stream
			pCodec = avcodec_find_decoder(pCodecCtx->codec_id);

			if (!pCodec)
			{
				avcodec_free_context(&pCodecCtx);
				pCodecCtx = NULL;
				// - Send error to node.
				continue;
			}

			// - Open the loaded codec
			if (avcodec_open2(pCodecCtx, pCodec, nullptr) < 0)
			{
				avcodec_free_context(&pCodecCtx);
				pCodecCtx = NULL;
				// - Send error to node.
				continue;
			}

			// Initialize SWS context for software scaling
			pVideoResampler = sws_getContext
			(
				pCodecCtx->width,
				pCodecCtx->height,
				pCodecCtx->pix_fmt,
				pRequestWidth > 0 ? pRequestWidth : pCodecCtx->width,
				pRequestHeight > 0 ? pRequestHeight : pCodecCtx->height,
				pPixelFormat != AV_PIX_FMT_NONE ? pPixelFormat : pCodecCtx->pix_fmt,
				SWS_BILINEAR,
				nullptr,
				nullptr,
				nullptr
			);

			// - Reset video buffer
			pBufferSize = (int)(pCodecCtx->framerate.num / pCodecCtx->framerate.den);

			for (auto i : pFrameBuffer)
			{
				delete [] i->buffer;
				delete i;
			}

			pFrameBuffer.clear();
		}

		// - If not initialized
		if (!pVideoResampler || !pCodecCtx || !pCodec)
		{
			// - Wait a bit, let the cpu free.
			av_usleep((int)(0.01 * 1000000.0));
			continue;
		}

		int seekAdj = -1;
		bool forceRender = false;

		// - Fill buffer
		while (true)
		{
			AVPacket packet;

			// - Set iterator to first frame
			if (pFrameBuffer.size() == 1)
				pCurrentFrame = pFrameBuffer.begin();

			// - Hard seek
			{
				std::unique_lock<std::mutex> lck(pMutex);
				if (pSeekRequest >= 0 && seekAdj < 0)
				{

					double seekTime = pSeekRequest * st->time_base.den / st->time_base.num;
					av_seek_frame(pFormatCtx, pSelectedStream, seekTime, AVSEEK_FLAG_BACKWARD);
					seekAdj = pSeekRequest;
					pSeekRequest = -1;
					readEnd = false;
					videoEnd = false;

					for (auto i : pFrameBuffer)
					{
						delete [] i->buffer;
						delete i;
					}

					pFrameBuffer.clear();
				}
				pCondVar.notify_all();
			}

			// - Frame seek
			{
				std::unique_lock<std::mutex> lck(pMutex);
				if (pSeekFrame)
				{
					if (pSeekFrame > 0 && pFrameBuffer.size() > 1 && pCurrentFrame != pFrameBuffer.end())
					{
						pCurrentFrame++;
						pSeekFrame = 0;
						forceRender = true;
					}

					else if (pSeekFrame < 0 && pFrameBuffer.size() > 1)
					{
						if (pCurrentFrame == pFrameBuffer.begin())
						{
							double seekTime = ((*pCurrentFrame)->time - 1) * st->time_base.den / st->time_base.num;
							av_seek_frame(pFormatCtx, pSelectedStream, seekTime, AVSEEK_FLAG_BACKWARD);
							pFrameBuffer.clear();
							seekAdj = 2147483646;
							readEnd = false;
						}
						else
						{
							pCurrentFrame--;
							forceRender = true;
						}

						pSeekFrame = 0;
						videoEnd = false;
					}
				}
				pCondVar.notify_all();
			}

			// - Move frame iterator to the correct frame
			if (seekAdj >= 0 && pFrameBuffer.size() >= 2 && pFrameBuffer.back()->keyFrame)
			{
				while (std::next(pCurrentFrame, 1) != pFrameBuffer.end() && (*std::next(pCurrentFrame, 1))->time <= seekAdj)
					pCurrentFrame++;

				seekAdj = -1;
				forceRender = true;
				break;
			}

			// - Check if we have a full frame buffer
			if (pFrameBuffer.size() > 1 && pFrameBuffer.back()->keyFrame && pCurrentFrame == pFrameBuffer.end())
			{
				for (auto it = pFrameBuffer.begin(); it != pFrameBuffer.end(); ++it)
				{
					delete [] (*it)->buffer;
					delete (*it);
				}

				pFrameBuffer.clear();
			}

			if (readEnd && (*pCurrentFrame)->index == pFrameBuffer.back()->index)
			{
				videoEnd = true;
				pPause = true;
			}

			if (videoEnd && pPause)
				break;

			// - We have frame to render better to check if we must do it
			if (pFrameBuffer.size() > 1
			&& pCurrentFrame != pFrameBuffer.end()
			&& !((*pCurrentFrame)->index == pFrameBuffer.back()->index))
			{
				auto nextFrame = pCurrentFrame; nextFrame++;

				// - Elapsed time since the last render
				double elapsed = (double)(av_gettime() / 1000000.0) - videoTimer;

				// - If the time elapsed is greater than the pts for the next frame skil read
				if (pFrameBuffer.size() > 1 && pFrameBuffer.back()->keyFrame && seekAdj < 0)
				{
					double delta = (*nextFrame)->time - (*pCurrentFrame)->time - elapsed;
					if (delta > 0 && !pDisableTiming) av_usleep((int)(delta * 1000000.0 + 500));
					break;
				}
				else if (elapsed >= (*nextFrame)->time - (*pCurrentFrame)->time && seekAdj < 0)
					break;
			}

			// - Read video packet
			if ((res = av_read_frame(pFormatCtx, &packet)) >= 0)
			{
				if (pSelectedStream == packet.stream_index)
				{
					// - Send a packet to decode queue
					res = avcodec_send_packet(pCodecCtx, &packet);

					// - Incomplete packet or error
					//if (res) continue;

					for ( ; !res ; )
					{
						// - Alloc a frame container
						AVFrame *pFrame = av_frame_alloc();

						// - Receive decoded frame
						res = avcodec_receive_frame(pCodecCtx, pFrame);

						// - Incomplete packet or error
						if (res)
						{
							av_frame_free(&pFrame);
							continue;
						}

						// - Get the current frame presentation time
						auto pts = TIMESTAMP(pFrame) * av_q2d(st->time_base);

						int format = pPixelFormat != AV_PIX_FMT_NONE ? pPixelFormat : pFrame->format;

						VideoFrame * frame = new VideoFrame();
						frame->time = pts;
						frame->width = pRequestWidth > 0 ? pRequestWidth : pFrame->width;
						frame->height = pRequestHeight > 0 ? pRequestHeight : pFrame->height;
						frame->format = format;
						frame->keyFrame = pFrame->key_frame;
						frame->quality = pFrame->quality;
						frame->index = pFrame->pts;
						frame->self = this;

						AVPicture pict;

						int y = frame->width * frame->height;

						switch (format)
						{
							case AV_PIX_FMT_BGR24:
								frame->bufferSize = y * 3;
								frame->buffer = new uint8_t[frame->bufferSize];
								frame->bufferSize *= sizeof(uint8_t);

								pict.data[0] = frame->buffer;
								pict.data[1] = NULL;
								pict.data[2] = NULL;
								pict.linesize[0] = frame->width * 3;
							    pict.linesize[1] = 0;
							    pict.linesize[2] = 0;
								break;

							case AV_PIX_FMT_YUV420P:
								frame->bufferSize = y + 2 * (y / 4);
								frame->buffer = new uint8_t[frame->bufferSize];
								frame->bufferSize *= sizeof(uint8_t);

								pict.data[0] = frame->buffer;
								pict.data[1] = frame->buffer + y;
								pict.data[2] = frame->buffer + (y + y / 4);
								pict.linesize[0] = frame->width;
							    pict.linesize[1] = frame->width / 2;
							    pict.linesize[2] = frame->width / 2;
								break;

							default:
								// - Send error to node. not supported
								av_frame_free(&pFrame);
								return;
						}

						// - Convert video frame and write in the VideoFrame buffer
						sws_scale(pVideoResampler, (uint8_t const * const *)pFrame->data,
							 pFrame->linesize, 0, pCodecCtx->height,
							 pict.data, pict.linesize);

						av_frame_free(&pFrame);

						// - Add frame in the rendering queue
						pFrameBuffer.push_back(frame);

						break;
					}
				}

				av_free_packet(&packet);
			}
			else if (res == AVERROR_EOF)
			{
				readEnd = true;
			}
		}

		if (pDisableTiming && videoEnd)
			break;

		// - Play pause
		{
			std::unique_lock<std::mutex> lck(pMutex);
			if (pPause && !forceRender)
			{
				videoTimer = (double)(av_gettime() / 1000000.0);
				continue;
			}
			else if (!pPause && videoEnd)
			{
				// - Start from zero
				av_seek_frame(pFormatCtx, pSelectedStream, 0, AVSEEK_FLAG_ANY);
				readEnd = false;
				videoEnd = false;

				videoTimer = (double)(av_gettime() / 1000000.0);
				continue;
			}
			pCondVar.notify_all();
		}

		// - Send frame to nodejs
		if (pCurrentFrame != pFrameBuffer.end())
		{
			VideoFrame * frame = *pCurrentFrame;

			VideoFrame * frameCopy = new VideoFrame();
			memcpy(frameCopy, frame, sizeof(VideoFrame));
			frameCopy->buffer = new uint8_t[frameCopy->bufferSize];
			memcpy(frameCopy->buffer, frame->buffer, sizeof(uint8_t) * frameCopy->bufferSize);

			callback((const char *)frameCopy, sizeof(VideoFrame));

			delete frameCopy;

			videoTimer = (double)(av_gettime() / 1000000.0);

			forceRender = false;

			pRendering.wait();
		}

		std::unique_lock<std::mutex> lck(pMutex);
		if (!pPause)
			pCurrentFrame++;
		pCondVar.notify_all();
    }

	if (pFormatCtx)
	{
		avformat_close_input(&pFormatCtx);
		avformat_free_context(pFormatCtx);
		pFormatCtx = NULL;
	}

	if (pVideoResampler) sws_freeContext(pVideoResampler);
	if (pCodecCtx) avcodec_free_context(&pCodecCtx);
	pVideoResampler = NULL;

	for (auto it = pFrameBuffer.begin(); it != pFrameBuffer.end(); ++it)
	{
		delete [] (*it)->buffer;
		delete (*it);
	}

	pFrameBuffer.clear();
}

NAN_METHOD(Reader::Process)
{
	// ---------------------------------------------------------------------
	// - PURE MADNESS - please don't do this mess with pointers at home
	// ---------------------------------------------------------------------

	// - Expect argument to be string
	uint32_t p1 = info[0]->Uint32Value();
	uint32_t p2 = info[1]->Uint32Value();
	int    size = (int)info[2]->Int32Value();

	uint64_t dataPointer = ((uint64_t)p1) << 32 | p2;

	VideoFrame *frame = (VideoFrame*)dataPointer;

	// - Get caller object
	auto that = info.Data().As<v8::Object>();

	// unwrap this Reader
	Reader * self = Nan::ObjectWrap::Unwrap<Reader>(that);

	std::unique_lock<std::mutex> lck(self->pMutex);

	auto frameStruct = Nan::New<v8::Object>();

	auto buffer = Nan::CopyBuffer((char*)frame->buffer, frame->bufferSize).ToLocalChecked();

	Nan::Set(frameStruct, Nan::New("time").ToLocalChecked(), Nan::New(frame->time));
	Nan::Set(frameStruct, Nan::New("width").ToLocalChecked(), Nan::New(frame->width));
	Nan::Set(frameStruct, Nan::New("height").ToLocalChecked(), Nan::New(frame->height));
	Nan::Set(frameStruct, Nan::New("index").ToLocalChecked(), Nan::New(frame->index));
	Nan::Set(frameStruct, Nan::New("keyFrame").ToLocalChecked(), Nan::New(frame->keyFrame));
	Nan::Set(frameStruct, Nan::New("quality").ToLocalChecked(), Nan::New(frame->quality));
	Nan::Set(frameStruct, Nan::New("buffer").ToLocalChecked(), buffer);
	Nan::Set(frameStruct, Nan::New("format").ToLocalChecked(), Nan::New(getPixelFormatId(frame->format).c_str()).ToLocalChecked());

	v8::Local<v8::Value> params[2] =
	{
		Nan::New("frame").ToLocalChecked(),
		frameStruct
	};

	delete [] frame->buffer;

	auto emit = that->Get(Nan::New("emit").ToLocalChecked()).As<v8::Function>();
	emit->Call(that, 2, params);

	// - Now reader thread can continue
	self->pRendering.notify();
}

NAN_METHOD(Reader::Closed)
{
	// - Get current JS context
	auto context = v8::Isolate::GetCurrent()->GetCurrentContext()->Global();

	// - Get caller object
	auto that = info.Data().As<v8::Object>();

	v8::Local<v8::Value> params[1] =
	{
		Nan::New("end").ToLocalChecked()
	};

	auto emit = that->Get(Nan::New("emit").ToLocalChecked()).As<v8::Function>();
	emit->Call(that, 1, params);
}

NAN_METHOD(Reader::TogglePause)
{
	// unwrap this Reader
	Reader * self = Nan::ObjectWrap::Unwrap<Reader>(info.This());

	// - Argument 0
	if (info.Length() > 0)
	{
		if (!info[0]->IsBoolean())
			return THROW("Reader::Initialize - expected first argument to be a boolean");

		std::unique_lock<std::mutex> lck(self->pMutex);

		self->pPause = info[0]->BooleanValue();
	}
}

NAN_METHOD(Reader::PrevFrame)
{
	// unwrap this Reader
	Reader * self = Nan::ObjectWrap::Unwrap<Reader>(info.This());

	std::unique_lock<std::mutex> lck(self->pMutex);

	self->pSeekFrame = -1;
}

NAN_METHOD(Reader::NextFrame)
{
	// unwrap this Reader
	Reader * self = Nan::ObjectWrap::Unwrap<Reader>(info.This());

	std::unique_lock<std::mutex> lck(self->pMutex);

	self->pSeekFrame = 1;
}

NAN_METHOD(Reader::Seek)
{
	// unwrap this Reader
	Reader * self = Nan::ObjectWrap::Unwrap<Reader>(info.This());

	// - Argument 0
	if (info.Length() > 0)
	{
		if (!info[0]->IsNumber())
			return THROW("Reader::Initialize - expected first argument to be a boolean");

		if (self->pSeekRequest >= 0)
			return;

		std::unique_lock<std::mutex> lck(self->pMutex);

		self->pSeekRequest = info[0]->NumberValue();
	}
}

NAN_METHOD(Reader::Close)
{
	// unwrap this Reader
	Reader * self = Nan::ObjectWrap::Unwrap<Reader>(info.This());

	std::unique_lock<std::mutex> lck(self->pMutex);

	self->pCanRun = false;
}

NAN_GETTER(Reader::HandleGetters)
{
	Reader* self = Nan::ObjectWrap::Unwrap<Reader>(info.This());

	std::string propertyName = std::string(*Nan::Utf8String(property));

	info.GetReturnValue().Set(Nan::Undefined());
}

NAN_SETTER(Reader::HandleSetters)
{
	Reader* self = Nan::ObjectWrap::Unwrap<Reader>(info.This());

	std::string propertyName = std::string(*Nan::Utf8String(property));
}
