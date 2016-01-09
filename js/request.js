var url = require('url');

var next_id = 0;
// results[id] = { threw: error, completed: [ errorValue, successValue ], timedOut: bool };
var results = {};

exports.request = function(req, res, opts, handler) {

  if (req.method === 'POST') {

    var id = ++next_id;
    results[id] = {};

    var requestBody = '';

    req.on('data', function(chunk) {
      requestBody += chunk.toString();
    });

    req.on('end', function(chunk) {
      setTimeout(function() {
        if (!results[id].completed) {
          results[id].timedOut = true;
        }
      }, opts.timeout);

      var requestObject;
      try {
        requestObject = JSON.parse(requestBody);
      } catch (e) {
        console.log("POSTed bad json: " + e.toString());
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.end(e.toString());
        return;
      }

      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end(String(id));

      var context = {
        done: function(err, message) {
          results[id].completed = [ err, message ];
          if (err) {
            console.warn('Error:', err);
          }
        }
      };

      context.fail = function(err) { context.done(err, null); };
      context.succeed = function(data) { context.done(null, data); };

      try {
        handler(requestObject, context);
      } catch (e) {
        console.log("Handler crashed", e);
        results[id].threw = e;
      }

    });

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

    var status = null;
    var responseBody = null;

    if (result === undefined) {
      status = 404;
    } else {
      if (result.completed) {
        if (result.completed[0] !== null) {
          status = 502;
          responseBody = result.completed[0];
        } else {
          status = 201;
          responseBody = result.completed[1];
        }
      } else if (result.threw) {
        status = 500;
          responseBody = result.threw.toString();
      } else if (result.timedOut) {
        status = 504;
      } else {
        // still in progress
        status = 200;
      }
    }

    res.writeHead(status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(responseBody) + '\n');

  } else {

    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end('Not implemented: ' + req.method + '\n');

  }

};
