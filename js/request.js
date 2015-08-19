var url = require('url');

var next_id = 0;
// results[id] = { completed: [ errorValue, successValue ], timedOut: bool };
var results = {};

exports.request = function(req, res, opts, handler) {

  if (req.method === 'POST') {

    var id = ++next_id;
    results[id] = {};

    var requestBody = '';

    req.on('data', function(chunk) {
      setTimeout(function() {
        if (!results[id].completed) {
          results[id].timedOut = true;
        }
      }, opts.timeout);
      requestBody += chunk.toString();
    });

    req.on('end', function(chunk) {
      handler(JSON.parse(requestBody), {
        done: function(err, message) {
          results[id].completed = [ err, message ];
          if (err) {
            console.warn('Error:', err);
          }
          console.info('Finished:', message);
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
    var result = results[request_id];

    var status = 200;
    var responseBody = null;

    if (result.completed && result.completed[0] === null) {
      status = 201;
      responseBody = result.completed[1];
    } else if (result.completed) {
      status = 502;
      responseBody = result.completed[0];
    } else if (result.timedOut) {
      status = 504;
    }

    res.writeHead(status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(responseBody) + '\n');

  } else {

    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end('Not implemented: ' + req.method + '\n');

  }

};
