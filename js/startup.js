

var http = require('http');
var stdio = require('stdio');
var request = require('./request.js');

var opts = stdio.getopt({
  'port': {mandatory: true, args: 1, key: 'p', description: 'Listen port'},
  'module-path': {mandatory: true, args: 1, key: 'm', description: 'Path to the lambda module'},
  'handler': {mandatory: true, args: 1, key: 'h', description: 'handler function to call'},
  'timeout': {mandatory: true, args: 1, key: 't', description: 'timeout for handler function'}
});

var module = require(opts['module-path']);
var server = http.createServer();

server.on('listening', function () {
  var local = server.address();

  var host = (
      local.family == "IPv6"
      ? "[" + local.address + "]"
      : local.address
  );

  server.url = 'http://' + host + ':' + local.port + '/';

  console.info('Server running at', server.url, 'for ' + opts['module-path'] + ' / ' + opts.handler);
});

server.on('request', function (req, res) {
  request.request(req, res, opts, module[opts.handler], server);
});

server.on('close', function () {
  console.info('Terminating server at', server.url, 'for ' + opts['module-path'] + ' / ' + opts.handler);
  // process.exit is a hack to get the process to die quickly
  process.exit(0);
});

server.listen(opts.port);
