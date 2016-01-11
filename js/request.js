var merge = require('merge');
var url = require('url');

var next_id = 0;
// results[id] = { threw: error, completed: [ errorValue, successValue ], timedOut: bool };
var results = {};

var region = function () {
    return process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || process.env.AMAZON_REGION || "xx-dummy-0";
};

var defaultContextObject = function () {
  return {
    // Fixed, but reasonably representative
    functionName: "via-aws-lambda-runner",
    functionVersion: "$LATEST",
    invokedFunctionArn: "arn:aws:lambda:" + region() + ":000000000000:function:via-aws-lambda-runner:$LATEST",
    memoryLimitInMB: 100,
    awsRequestId: "00000000-0000-0000-0000-000000000000",
    logGroupName: "/aws/lambda/via-aws-lambda-runner",
    logStreamName: "some-log-stream-name",
  };
};

var makeContextObject = function (timeout, overrides) {
  var context = merge(true, defaultContextObject(), overrides);

  var approximateEndTime = (new Date().getTime()) + timeout;

  context.getRemainingTimeInMillis = function () {
    return approximateEndTime - (new Date().getTime());
  };

  context.fail = function(err) { context.done(err, null); };
  context.succeed = function(data) { context.done(null, data); };

  return context;
};

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

      var event = requestObject.event;

      var context = makeContextObject(opts.timeout, requestObject.context || {});
      context.done = function (err, result) {
        results[id].completed = [ err, result ];
        if (err) {
          console.warn('Error:', err);
        }
      };

      try {
        handler(event, context);
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
        if (result.completed[0] !== null && result.completed[0] !== undefined) {
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

    // non-standard stringification of undefined
    if (responseBody === undefined) responseBody = null;

    res.writeHead(status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(responseBody) + '\n');

  } else {

    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end('Not implemented: ' + req.method + '\n');

  }

};

// vi: set sw=2 et :
