{
	"targets":
	[
		{
			"target_name": "decoder",
			"dependencies": ["copy_binaries"],

			"cflags!": [ "-fno-exceptions" ],
			"cflags": [ "-std=c++11" ],
			"cflags_cc!": [ "-fno-exceptions" ],

			'xcode_settings':
			{
				'CLANG_CXX_LANGUAGE_STANDARD': 'c++11',
				'CLANG_CXX_LIBRARY': 'libc++',
				'MACOSX_DEPLOYMENT_TARGET': '10.7',
				'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
				'GCC_ENABLE_CPP_RTTI': 'YES'
			},

			"include_dirs" :
			[
				"src",
				"includes",
				"<!(node -e \"require('nan')\")"
			],

			"sources":
			[
				"src/main.cpp",
				"src/video.cpp",
				"src/stream.cpp",
				"src/codec.cpp",
				"src/reader.cpp",
				"src/utils.cpp"
			],

			"conditions":
			[
				['OS=="linux"',
				{
					"libraries":
					[
						"../bin/libavcodec.so",
						"../bin/libavdevice.so",
						"../bin/libavfilter.so",
						"../bin/libavformat.so",
						"../bin/libavutil.so",
						"../bin/libpostproc.so",
						"../bin/libswresample.so",
						"../bin/libswscale.so"
					]
				}],
				['OS=="win"',
				{
					"libraries":
					[
						"../bin/avcodec.lib",
						"../bin/avdevice.lib",
						"../bin/avfilter.lib",
						"../bin/avformat.lib",
						"../bin/avutil.lib",
						"../bin/postproc.lib",
						"../bin/swresample.lib",
						"../bin/swscale.lib"
					]
				}
				]
			]
		},

		{
			"target_name": "copy_binaries",
			"type": "none",
			"dependencies": [],

			'copies':
			[
				{
					'destination': 'build/Release/',
					'files':
					[
						"bin/avcodec-58.dll",
						"bin/avdevice-58.dll",
						"bin/avfilter-7.dll",
						"bin/avformat-58.dll",
						"bin/avutil-56.dll",
						"bin/postproc-55.dll",
						"bin/swresample-3.dll",
						"bin/swscale-5.dll",
						"bin/libavcodec.so",
						"bin/libavdevice.so",
						"bin/libavfilter.so",
						"bin/libavformat.so",
						"bin/libavutil.so",
						"bin/libpostproc.so",
						"bin/libswresample.so",
						"bin/libswscale.so"
					]
				}
			]
		}
	]
}
