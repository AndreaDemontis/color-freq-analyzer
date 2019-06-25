const readLine = require("readline")
const m = require('./')

const rl = readLine.createInterface(
{
	input: process.stdin,
	output: process.stdout
});

console.log("                                         ")
console.log("=========================================")
console.log("=========================================")
console.log("             Video analyzer              ")
console.log("=========================================")
console.log("=========================================")
console.log("										  ")

rl.question('File path: ', (file) =>
{
	analyzer = new m.Video(file);

	analyzer.load();

	console.log(analyzer);

	let reader = analyzer.getReader();
	reader.togglePause(false);

	function doggo()
	{
		reader.seek((Math.random() * 50) + 1);

		setTimeout(doggo, 1);
	}

	reader.on('frame', (data) =>
	{
		console.log(data);
	});

	reader.on('end', () =>
	{
		console.log("FINE VIDEO");
	});

	// param 1 - true: video scan / false: video reproduction
	// param 2 - pixel buffer format
	// param 3 - request video width
	// param 4 - request video height
	reader.initialize(true, "BGR24", 100, 100);

	//doggo();
});
