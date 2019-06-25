#include "stream.hpp"
#include "codec.hpp"
#include "utils.hpp"

using namespace std;
#include <regex>
#include <iostream>

Nan::Persistent<v8::Function> Stream::constructor;

Stream::Stream() : pStream(NULL)
{

}

Stream::~Stream()
{
    pStream = NULL;
}

NAN_MODULE_INIT(Stream::Init)
{
	auto ctor = Nan::New<v8::FunctionTemplate>(Stream::New);

	ctor->InstanceTemplate()->SetInternalFieldCount(1);
	ctor->SetClassName(Nan::New("Stream").ToLocalChecked());

	// - Link our getters and setter to the object property
    ACCESSOR(ctor, "id", Stream::HandleGetters, Stream::HandleSetters);
	ACCESSOR(ctor, "index", Stream::HandleGetters, Stream::HandleSetters);
	ACCESSOR(ctor, "codec", Stream::HandleGetters, Stream::HandleSetters);
    ACCESSOR(ctor, "duration", Stream::HandleGetters, Stream::HandleSetters);
    ACCESSOR(ctor, "timeBase", Stream::HandleGetters, Stream::HandleSetters);
    ACCESSOR(ctor, "metadata", Stream::HandleGetters, Stream::HandleSetters);
    ACCESSOR(ctor, "startTime", Stream::HandleGetters, Stream::HandleSetters);
    ACCESSOR(ctor, "frameCount", Stream::HandleGetters, Stream::HandleSetters);

    constructor.Reset(Nan::GetFunction(ctor).ToLocalChecked());
}

NAN_METHOD(Stream::New)
{
	// - Throw an error if constructor is called without new keyword
	if(!info.IsConstructCall())
		return THROW("Video::New - called without new keyword");

	// - Expect exactly 0 arguments
	if(info.Length() != 0)
		return THROW("VideoAnalyzer::New - expected no arguments");

	// - Create a new instance and wrap our javascript instance
	Stream* obj = new Stream();
	obj->Wrap(info.Holder());

	// - Return the wrapped javascript instance
	info.GetReturnValue().Set(info.Holder());
}

v8::Local<v8::Object> Stream::NewObject(AVStream *stream)
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Function> cons = Nan::New(constructor);
    auto instance = Nan::NewInstance(cons).ToLocalChecked();

    // - Set internal data
    Stream* obj = Nan::ObjectWrap::Unwrap<Stream>(instance);
    obj->pStream = stream;

    return scope.Escape(instance);
}

AVStream * Stream::getStream()
{
    return pStream;
}

NAN_GETTER(Stream::HandleGetters)
{
	Stream* self = Nan::ObjectWrap::Unwrap<Stream>(info.This());

	std::string propertyName = std::string(*Nan::Utf8String(property));

    if (propertyName == "index" && self->pStream)
		info.GetReturnValue().Set(Nan::New(self->pStream->index));

    else if (propertyName == "id")
    	info.GetReturnValue().Set(Nan::New(self->pStream->id));

    else if (propertyName == "codec")
    	info.GetReturnValue().Set(Codec::NewObject(self->pStream->codec));

    else if (propertyName == "timeBase")
    {
        auto fraction = Nan::New<v8::Object>();

        Nan::Set(fraction, Nan::New("num").ToLocalChecked(), Nan::New(self->pStream->time_base.num));
        Nan::Set(fraction, Nan::New("den").ToLocalChecked(), Nan::New(self->pStream->time_base.den));

        info.GetReturnValue().Set(fraction);
    }

    else if (propertyName == "startTime")
        info.GetReturnValue().Set(Nan::New((long int)self->pStream->start_time));

    else if (propertyName == "duration")
        info.GetReturnValue().Set(Nan::New((double)self->pStream->duration / av_q2d(self->pStream->time_base)));

    else if (propertyName == "frameCount")
        info.GetReturnValue().Set(Nan::New((long int)self->pStream->nb_frames));

    else if (propertyName == "metadata")
    {
        auto meta = Nan::New<v8::Object>();
        regex regex("_([*])");

        AVDictionaryEntry *t = NULL;
        while (t = av_dict_get(self->pStream->metadata, "", t, AV_DICT_IGNORE_SUFFIX))
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

	else
		info.GetReturnValue().Set(Nan::Undefined());
}

NAN_SETTER(Stream::HandleSetters)
{
	Stream* self = Nan::ObjectWrap::Unwrap<Stream>(info.This());

	std::string propertyName = std::string(*Nan::Utf8String(property));
}
