
var url = require('url');

var next_id = 0;
var done = {};
var errors = {};
var successes = {};
var timeout = {};

exports.request = function(req, res, opts, handler) {
  if (req.method === 'POST') {
    var id = next_id;
    var postOutput = '';
    next_id += 1;
    req.on('data', function(chunk) {
      setTimeout(function() {
        if (!done[id]) {
          timeout[id] = true;
        }
      }, opts.timeout);
      postOutput += chunk.toString();
    });
    req.on('end', function(chunk) {
      handler(JSON.parse(postOutput), {
        done: function(err, message) {
          if (err) {
            errors[id] = err;
            console.warn('Error:', err);
          } else {
            successes[id] = message;
          }
          console.info('Finished:', message);
          done[id] = true;
        }
      });
    });
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(String(id));
  } else if (req.method === 'DELETE') {
    // FIXME untested
    res.writeHead(202, {'Content-Type': 'text/plain'});
    var terminationMessage = 'Terminating server at http://[localhost]:' + opts.port + ' for ' + opts['module-path'] + ' / ' + opts.handler;
    res.end(terminationMessage + '\n');
    console.info(terminationMessage);
    server.close();
  } else if (req.method === 'GET') {
    var request_id = parseInt(url.parse(req.url, true).query.id);
    var status = 200;
    var getOutput = null;
    if (timeout[request_id]) {
      status = 504;
    } else if (errors[request_id]) {
      status = 502;
      getOutput = errors[request_id];
    } else if (done[request_id]) {
      status = 201;
      getOutput = successes[request_id];
    }
    res.writeHead(status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(getOutput) + '\n');
  } else {
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end('Not implemented: ' + req.method + '\n');
  }
};
