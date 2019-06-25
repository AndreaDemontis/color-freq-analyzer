#include "codec.hpp"
#include "utils.hpp"

using namespace std;

Nan::Persistent<v8::Function> Codec::constructor;

Codec::Codec() : pCodec(NULL)
{

}

Codec::~Codec()
{
    pCodec = NULL;
}

NAN_MODULE_INIT(Codec::Init)
{
	auto ctor = Nan::New<v8::FunctionTemplate>(Codec::New);

	ctor->InstanceTemplate()->SetInternalFieldCount(1);
    ctor->SetClassName(Nan::New("Codec").ToLocalChecked());

    // - Link our getters and setter to the object property
    ACCESSOR(ctor, "type", Codec::HandleGetters, Codec::HandleSetters);
	ACCESSOR(ctor, "id", Codec::HandleGetters, Codec::HandleSetters);
    ACCESSOR(ctor, "bitRate", Codec::HandleGetters, Codec::HandleSetters);
    ACCESSOR(ctor, "bitRateTolerance", Codec::HandleGetters, Codec::HandleSetters);
    ACCESSOR(ctor, "globalQuality", Codec::HandleGetters, Codec::HandleSetters);
    ACCESSOR(ctor, "compressionLevel", Codec::HandleGetters, Codec::HandleSetters);
    ACCESSOR(ctor, "timeBase", Codec::HandleGetters, Codec::HandleSetters);
    ACCESSOR(ctor, "delay", Codec::HandleGetters, Codec::HandleSetters);
    ACCESSOR(ctor, "video", Codec::HandleGetters, Codec::HandleSetters);
    ACCESSOR(ctor, "audio", Codec::HandleGetters, Codec::HandleSetters);
    ACCESSOR(ctor, "framerate", Codec::HandleGetters, Codec::HandleSetters);

	// - Link our getters and setter to the object property
    ACCESSOR(ctor, "id", Codec::HandleGetters, Codec::HandleSetters);

    constructor.Reset(Nan::GetFunction(ctor).ToLocalChecked());
}

NAN_METHOD(Codec::New)
{
	// - Throw an error if constructor is called without new keyword
	if(!info.IsConstructCall())
		return THROW("Video::New - called without new keyword");

	// - Expect exactly 0 arguments
	if(info.Length() != 0)
		return THROW("VideoAnalyzer::New - expected no arguments");

	// - Create a new instance and wrap our javascript instance
	Codec* obj = new Codec();
	obj->Wrap(info.Holder());

	// - Return the wrapped javascript instance
	info.GetReturnValue().Set(info.Holder());
}

v8::Local<v8::Object> Codec::NewObject(AVCodecContext *codec)
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Function> cons = Nan::New(constructor);
    auto instance = Nan::NewInstance(cons).ToLocalChecked();

    // - Set internal data
    Codec* obj = Nan::ObjectWrap::Unwrap<Codec>(instance);
    obj->pCodec = codec;

    return scope.Escape(instance);
}

AVCodecContext * Codec::getCodecContext()
{
    return pCodec;
}

NAN_GETTER(Codec::HandleGetters)
{
	Codec* self = Nan::ObjectWrap::Unwrap<Codec>(info.This());

	std::string propertyName = std::string(*Nan::Utf8String(property));

    if (propertyName == "type" && self->pCodec)
    {
        string type = "UNKNOW";

        switch(self->pCodec->codec_type)
        {
            case AVMEDIA_TYPE_UNKNOWN: type = "UNKNOW"; break;
            case AVMEDIA_TYPE_VIDEO: type = "VIDEO"; break;
            case AVMEDIA_TYPE_AUDIO: type = "AUDIO"; break;
            case AVMEDIA_TYPE_DATA: type = "DATA"; break;
            case AVMEDIA_TYPE_SUBTITLE: type = "SUBTITLE"; break;
            case AVMEDIA_TYPE_ATTACHMENT: type = "ATTACHMENT"; break;
            case AVMEDIA_TYPE_NB: type = "NB"; break;
        }

		info.GetReturnValue().Set(Nan::New(type.c_str()).ToLocalChecked());
    }

    else if (propertyName == "id")
    	info.GetReturnValue().Set(Nan::New(getCodecId(self->pCodec->codec_id).c_str()).ToLocalChecked());

    else if (propertyName == "delay")
    	info.GetReturnValue().Set(Nan::New(self->pCodec->delay));

    else if (propertyName == "globalQuality")
    	info.GetReturnValue().Set(Nan::New(self->pCodec->global_quality));

    else if (propertyName == "bitRateTolerance")
    	info.GetReturnValue().Set(Nan::New(self->pCodec->bit_rate_tolerance));

    else if (propertyName == "bitRate")
    	info.GetReturnValue().Set(Nan::New((long int)self->pCodec->bit_rate));

    else if (propertyName == "compressionLevel")
    	info.GetReturnValue().Set(Nan::New(self->pCodec->compression_level));

    else if (propertyName == "timeBase")
    {
        auto fraction = Nan::New<v8::Object>();

        Nan::Set(fraction, Nan::New("num").ToLocalChecked(), Nan::New(self->pCodec->time_base.num));
        Nan::Set(fraction, Nan::New("den").ToLocalChecked(), Nan::New(self->pCodec->time_base.den));

        info.GetReturnValue().Set(fraction);
    }

    else if (propertyName == "framerate")
    {
        auto fraction = Nan::New<v8::Object>();

        Nan::Set(fraction, Nan::New("num").ToLocalChecked(), Nan::New(self->pCodec->framerate.num));
        Nan::Set(fraction, Nan::New("den").ToLocalChecked(), Nan::New(self->pCodec->framerate.den));

        info.GetReturnValue().Set(fraction);
    }

    else if (propertyName == "audio")
    {
        if (self->pCodec->codec_type != AVMEDIA_TYPE_AUDIO)
        {
            info.GetReturnValue().Set(Nan::Undefined());
            return;
        }

        auto audio = Nan::New<v8::Object>();

        Nan::Set(audio, Nan::New("channels").ToLocalChecked(), Nan::New(self->pCodec->channels));
        Nan::Set(audio, Nan::New("format").ToLocalChecked(), Nan::New(getSampleFormatId(self->pCodec->sample_fmt).c_str()).ToLocalChecked());
        Nan::Set(audio, Nan::New("cutoff").ToLocalChecked(), Nan::New(self->pCodec->cutoff));
        Nan::Set(audio, Nan::New("frameSize").ToLocalChecked(), Nan::New(self->pCodec->frame_size));
        Nan::Set(audio, Nan::New("blockAlign").ToLocalChecked(), Nan::New(self->pCodec->block_align));
        Nan::Set(audio, Nan::New("layout").ToLocalChecked(), Nan::New(channelLayoutId(self->pCodec->channel_layout).c_str()).ToLocalChecked());

        info.GetReturnValue().Set(audio);
    }

    else if (propertyName == "video")
    {
        if (self->pCodec->codec_type != AVMEDIA_TYPE_VIDEO)
        {
            info.GetReturnValue().Set(Nan::Undefined());
            return;
        }

        auto video = Nan::New<v8::Object>();

        auto size = Nan::New<v8::Object>();
        Nan::Set(size, Nan::New("width").ToLocalChecked(), Nan::New(self->pCodec->width));
        Nan::Set(size, Nan::New("height").ToLocalChecked(), Nan::New(self->pCodec->height));
        Nan::Set(video, Nan::New("frameSize").ToLocalChecked(), size);

        Nan::Set(video, Nan::New("format").ToLocalChecked(), Nan::New(getPixelFormatId(self->pCodec->pix_fmt).c_str()).ToLocalChecked());
        Nan::Set(video, Nan::New("colorSpace").ToLocalChecked(), Nan::New(getColorSpaceId(self->pCodec->colorspace).c_str()).ToLocalChecked());

        info.GetReturnValue().Set(video);
    }

	else
		info.GetReturnValue().Set(Nan::Undefined());
}

NAN_SETTER(Codec::HandleSetters)
{
	Codec* self = Nan::ObjectWrap::Unwrap<Codec>(info.This());

	std::string propertyName = std::string(*Nan::Utf8String(property));
}
