#include "video.hpp"
#include "stream.hpp"
#include "reader.hpp"
#include "utils.hpp"

#include <regex>

using namespace std;

Nan::Persistent<v8::FunctionTemplate> Video::constructor;

Video::Video(string path) : pFilePath(path), pFormatCtx(NULL)
{

}

Video::~Video()
{
	if (pFormatCtx)
	{
		avformat_close_input(&pFormatCtx);
		avformat_free_context(pFormatCtx);
		pFormatCtx = NULL;
	}
}

NAN_MODULE_INIT(Video::Init)
{
	auto ctor = Nan::New<v8::FunctionTemplate>(Video::New);
	constructor.Reset(ctor);

	ctor->InstanceTemplate()->SetInternalFieldCount(1);
	ctor->SetClassName(Nan::New("Video").ToLocalChecked());

	// - Link our getters and setter to the object property
	ACCESSOR(ctor, "filePath", Video::HandleGetters, Video::HandleSetters);
	ACCESSOR(ctor, "duration", Video::HandleGetters, Video::HandleSetters);
	ACCESSOR(ctor, "streams", Video::HandleGetters, Video::HandleSetters);
	ACCESSOR(ctor, "metadata", Video::HandleGetters, Video::HandleSetters);

	// - Define all methods
	Nan::SetPrototypeMethod(ctor, "load", Load);
	Nan::SetPrototypeMethod(ctor, "getReader", GetReader);

	target->Set(Nan::New("Video").ToLocalChecked(), ctor->GetFunction());
}

NAN_METHOD(Video::New)
{
	// - Throw an error if constructor is called without new keyword
	if(!info.IsConstructCall())
		return THROW("Video::New - called without new keyword");

	// - Expect exactly 1 arguments
	if(info.Length() != 1)
		return THROW("VideoAnalyzer::New - expected arguments filePath");

	// - Expect argument to be string
	if(!info[0]->IsString())
		return THROW("VideoAnalyzer::New - expected arguments to be a string");

	// - Take first parameter
	v8::String::Utf8Value filePath(info[0]->ToString());

	// - Create a new instance and wrap our javascript instance
	Video* obj = new Video(string(*filePath));
	obj->Wrap(info.Holder());

	// - Return the wrapped javascript instance
	info.GetReturnValue().Set(info.Holder());
}

NAN_METHOD(Video::Load)
{
	// - Unwrap this class
	Video * self = Nan::ObjectWrap::Unwrap<Video>(info.This());

	// - Alloc a new context
	if (!(self->pFormatCtx = avformat_alloc_context()))
		return THROW("Unable to create a video context.");

	// - Load the source in the context
	if (avformat_open_input(&self->pFormatCtx, self->pFilePath.c_str(), nullptr, nullptr) < 0)
	{
		avformat_free_context(self->pFormatCtx);
		self->pFormatCtx = NULL;
		return THROW("Unable to load the specified video.");
	}

	// - Inject metadata
	av_format_inject_global_side_data(self->pFormatCtx);

	// - Get stream informations
	if(avformat_find_stream_info(self->pFormatCtx, nullptr) < 0)
	{
		avformat_close_input(&self->pFormatCtx);
		avformat_free_context(self->pFormatCtx);
		self->pFormatCtx = NULL;
		return THROW("Cannot retrive file informations.");
	}

	info.GetReturnValue().Set(info.This());
}

NAN_METHOD(Video::GetReader)
{
	// - Unwrap this class
	Video * self = Nan::ObjectWrap::Unwrap<Video>(info.This());

	v8::Local<v8::Object> obj = Reader::NewObject(self);

	info.GetReturnValue().Set(obj);
}

std::string Video::getFilePath()
{
	return pFilePath;
}

NAN_GETTER(Video::HandleGetters)
{
	Video* self = Nan::ObjectWrap::Unwrap<Video>(info.This());

	std::string propertyName = std::string(*Nan::Utf8String(property));

	if (propertyName == "filePath")
		info.GetReturnValue().Set(Nan::New(self->pFilePath.c_str()).ToLocalChecked());

	else if (propertyName == "duration" && self->pFormatCtx)
		info.GetReturnValue().Set(Nan::New((double)(self->pFormatCtx->duration / AV_TIME_BASE)));

	else if (propertyName == "metadata" && self->pFormatCtx)
	{
        auto meta = Nan::New<v8::Object>();
        regex regex("_([*])");

        AVDictionaryEntry *t = NULL;
        while (t = av_dict_get(self->pFormatCtx->metadata, "", t, AV_DICT_IGNORE_SUFFIX))
        {
            if (t)
            {
                auto key = string(t->key);
                key = camelCase(key);
                Nan::Set(meta, Nan::New(key.c_str()).ToLocalChecked(), Nan::New(t->value).ToLocalChecked());
            }
        }

        info.GetReturnValue().Set(meta);
    }

	else if (propertyName == "streams" && self->pFormatCtx)
	{
		auto streams = Nan::New<v8::Array>();

		for (size_t i = 0; i < self->pFormatCtx->nb_streams; i++)
		{
			v8::Local<v8::Object> obj = Stream::NewObject(self->pFormatCtx->streams[i]);
        	streams->Set(i, obj);
		}

		info.GetReturnValue().Set(streams);
	}

	else
		info.GetReturnValue().Set(Nan::Undefined());
}

NAN_SETTER(Video::HandleSetters)
{
	Video* self = Nan::ObjectWrap::Unwrap<Video>(info.This());

	std::string propertyName = std::string(*Nan::Utf8String(property));
}
