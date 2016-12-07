

var http = require('http');
var stdio = require('stdio');
var request = require('./request.js');

var opts = stdio.getopt({
  'port': {mandatory: true, args: 1, key: 'p', description: 'Listen port'},
  'module-path': {mandatory: true, args: 1, key: 'm', description: 'Path to the lambda module'},
  'handler': {mandatory: true, args: 1, key: 'h', description: 'handler function to call'},
  'timeout': {mandatory: true, args: 1, key: 't', description: 'timeout for handler function'}
});
console.info(opts);

var module = require(opts['module-path']);
var server = http.createServer(function (req, res) {
  request.request(req, res, opts, module[opts.handler]);
}).listen(opts.port);
console.info('Server running at http://[localhost]:' + opts.port + ' for ' + opts['module-path'] + ' / ' + opts.handler);

process.on('SIGTERM', function () {
  console.info("Caught SIGTERM, stopping server");
  server.close(function () {
    process.exit(0);
  });
});
