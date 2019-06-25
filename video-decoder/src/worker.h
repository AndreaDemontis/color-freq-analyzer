#include <v8.h>
#include <nan.h>
#include <stdio.h>
#include <iostream>
#include <functional>

#include "utils.hpp"

class Worker : public Nan::AsyncProgressQueueWorker<char>
{

	friend class Nan::AsyncProgressQueueWorker<char>;

public:

	typedef std::function<void(std::function<void(const char *data, size_t size)> &)> ExecutionCallback;

	Worker(Nan::Callback *completed, Nan::Callback *progress, ExecutionCallback *action)
	: Nan::AsyncProgressQueueWorker<char>(completed)
	{
		exeCallback = action;
		completedCb = completed;
		progressCb = progress;
	}

	void Execute(const ExecutionProgress &progress)
	{
		//void(ExecutionProgress::*fn)(const char *, size_t ) const;
		void *inst = (void*)(&progress);
		auto fn = &ExecutionProgress::Send;

		std::function<void(const char *data, size_t size)> f([=](const char *data, size_t size)
		{
			(((ExecutionProgress*)inst)->*fn)(data, size);
		});

		(*exeCallback)(f);
	}

	void HandleProgressCallback(const char *data, size_t size)
	{
		Nan::HandleScope scope;

		// ---------------------------------------------------------------------
		// - PURE MADNESS - please don't do this mess with pointers at home
		// ---------------------------------------------------------------------

		// - Decompose pointer
		uint64_t pnum = (uint64_t)data;
		uint32_t p1 = (uint32_t)((pnum & 0xFFFFFFFF00000000LL) >> 32);
		uint32_t p2 = (uint32_t)(pnum & 0xFFFFFFFFLL);

		v8::Local<v8::Value> params[3] =
		{
			Nan::New<v8::Uint32>((unsigned int)p1),
			Nan::New<v8::Uint32>((unsigned int)p2),
			Nan::New<v8::Int32>((int)size)
		};

		progressCb->Call(3, params, async_resource);
	}

protected:

	ExecutionCallback *exeCallback;
	Nan::Callback *completedCb;
	Nan::Callback *progressCb;

};
