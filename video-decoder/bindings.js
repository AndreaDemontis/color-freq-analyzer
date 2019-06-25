var events = require('events');

var analyzer;
if (process.env.DEBUG)
	analyzer = require('./build/Debug/decoder.node');
else
	analyzer = require('./build/Release/decoder.node');

console.log(analyzer)
inherits(analyzer.Reader, events.EventEmitter);

module.exports = analyzer

// extend prototype
function inherits(target, source)
{
	for (var k in source.prototype)
		target.prototype[k] = source.prototype[k];
}
