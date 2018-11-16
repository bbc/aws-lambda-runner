var request = require('../request.js');

var mockRes = require('mock-res');
var mockReq = require('mock-req');
var assert = require('assert');

var post = function() {
  return new mockReq({method: 'POST'});
};

var opts = {'module-path': 'path', 'timeout': 1000};

var check_progress = function(run_id, code) {
  var done_response = new mockRes();
  request.request(new mockReq({method: 'GET', url: '/?id=' + run_id}), done_response, opts, null);
  assert.equal(done_response.statusCode, code);
  return JSON.parse(done_response._getString());
};

describe('request', function() {
  var req;
  var res;

  beforeEach(function(){
    req = post();
    res = new mockRes();
    delete process.env.AWS_DEFAULT_REGION;
    delete process.env.AWS_REGION;
    delete process.env.AMAZON_REGION;
  });

  it('should accept a POST with data and run', function(done) {
    request.request(req, res, opts, function(data, context, callback) {
      assert.equal(data, "hello world");
      var run_id = parseInt(res._getString());
      check_progress(run_id, 200);
      callback(null, 'goodbye');
      process.nextTick(() => {
        check_progress(run_id, 201);
        done();
      });
    });
    req.emit('data', '{"event":');
    req.emit('data', '"hello');
    req.emit('data', ' world"');
    req.emit('data', '}');
    req.emit('end');
  });

  it('should accept multiple POSTs with data and run', function(done) {
    request.request(req, res, opts, function(data, context, callback) {
      const run_id1 = parseInt(res._getString());
      callback(null, 'multiple: first');
      process.nextTick(() => {
        console.log('checking runid', run_id1);
        check_progress(run_id1, 201);
      });
    });

    var req2 = post();
    var res2 = new mockRes();
    request.request(req2, res2, opts, function(data, context, callback) {
      const run_id2 = parseInt(res2._getString());
      callback(null, 'multiple: second');
      process.nextTick(() => {
        console.log('checking runid', run_id2);
        check_progress(run_id2, 201);
        done();
      });
    });
    req.emit('data', '{"event":{}}');
    req.emit('end');
    req2.emit('data', '{"event":{}}');
    req2.emit('end');
  });

  it('should signal success', function(done) {
    request.request(req, res, opts, function(data, context, callback) {
      var run_id = parseInt(res._getString());
      callback(null, ['goodbye']);
      process.nextTick(() => {
          var responseData = check_progress(run_id, 201);
          assert.deepEqual(responseData, ['goodbye']);
          done();
      });
    });
    req.emit('data', '{"event":{}}');
    req.emit('end');
  });

  it('should signal an error via callback()', function(done) {
    request.request(req, res, opts, function(data, context, callback) {
      var run_id = parseInt(res._getString());
      callback({an: 'error'}, 'goodbye');
      process.nextTick(() => {
        var responseData = check_progress(run_id, 500);
        assert.equal(responseData, '{"an":"error"}');
        done();
      });
    });
    req.emit('data', '{"event":{}}');
    req.emit('end');
  });

  it('should timeout', function(done) {
    var opts = { timeout: 1 };
    request.request(req, res, opts, function(data, context, cb) {
      var run_id = parseInt(res._getString());
      setTimeout(function() {
        check_progress(run_id, 504);
        done();
      }, 10);
    });
    req.emit('data', '{"event":{}}');
    req.emit('end');
  });

  it('should give 404 on no such job', function(done) {
    request.request(req, res, opts, function(data, context) {
      var run_id = parseInt(res._getString());
      check_progress(run_id+1, 404);
      done();
    });
    req.emit('data', '{"event":{}}');
    req.emit('end');
  });

  it('should emit 400 if POSTed bad JSON', function() {
    request.request(req, res, opts, function() {}); // never called
    req.emit('data', '[');
    req.emit('end');
    assert.equal(res.statusCode, 400);
  });

  it('should fail the job if the handler throws', function(done) {
    request.request(req, res, opts, function(data, context) {
      throw new Error('bang');
    });
    req.emit('data', '{"event":{}}');
    req.emit('end');

    process.nextTick(() => {
      var run_id = parseInt(res._getString());
      var res2 = new mockRes();
      request.request(new mockReq({method: 'GET', url: '/?id=' + run_id}), res2, opts, null);
      assert.equal(res2.statusCode, 500);
      assert.equal(res2._getString(), '"Error: bang"\n');
      done();
    });
  });

  it('should support getRemainingTimeInMillis', function(done) {
    request.request(req, res, opts, function(data, context, callback) {
      var r1 = context.getRemainingTimeInMillis();
      assert(r1 <= 1000);
      assert(r1 > 800);

      setTimeout(function () {
        var r2 = context.getRemainingTimeInMillis();
        assert(r2 <= 600);
        assert(r2 > 400);

        callback(null, {});
        done();
      }, 500);

    });
    req.emit('data', '{"event":{}}');
    req.emit('end');
  });

  it('should provide the context properties', function(done) {
    request.request(req, res, opts, function(data, context) {
      assert(context.functionName.match(/^[A-Za-z0-9_-]+$/));
      assert(context.functionVersion.match(/^\S+$/));
      assert(context.invokedFunctionArn.match(/^arn:aws:lambda:[a-z0-9-]+:\d+:function:[A-Za-z0-9_-]+:\S+$/));
      assert(typeof(context.memoryLimitInMB) === 'number');
      assert(context.awsRequestId.match(/^[0-9a-f-]+$/));
      assert(context.logGroupName.match(/^\/aws\/lambda\/[A-Za-z0-9_-]+$/));
      assert(context.logStreamName.match(/^\S+$/));

      // not tested: identity
      // not tested: clientContext
      done();
    });
    req.emit('data', '{"event":{}}');
    req.emit('end');
  });

  it('should allow the context to be overridden', function (done) {
    request.request(req, res, opts, function(data, context) {
      assert.equal(context.functionName, 'my-function');
      assert.equal(context.invokedFunctionArn, 'arn:aws:lambda:eu-west-1:000000000002:function:my-function:$LATEST');
      done();
    });

    var c = {
      functionName: 'my-function',
      invokedFunctionArn: 'arn:aws:lambda:eu-west-1:000000000002:function:my-function:$LATEST',
    };

    req.emit('data', JSON.stringify({ event: {}, context: c }));
    req.emit('end');
  });

  it('should consider undefined error to be like null', function (done) {
    request.request(req, res, opts, function(data, context, callback) {
      callback(undefined, [7]);
      process.nextTick(function () {
        var ans = check_progress(parseInt(res._getString()), 201);
        assert.deepEqual(ans, [7]);
        done();
      });
    });
    req.emit('data', '{"event":{}}');
    req.emit('end');
  });

  it('should replace undefined success by null so that it makes valid JSON', function (done) {
    request.request(req, res, opts, function(data, context, callback) {
      callback(null, undefined);
      process.nextTick(function () {
        var ans = check_progress(parseInt(res._getString()), 201);
        assert(ans === null);
        done();
      });
    });
    req.emit('data', '{"event":{}}');
    req.emit('end');
  });

  var test_region = function (env, expectedRegion, done) {
    request.request(req, res, opts, function(data, context, callback) {
      assert.equal(context.invokedFunctionArn.split(/:/)[3], expectedRegion);
      callback();
      done();
    });

    process.env = Object.assign({}, process.env, env);
    req.emit('data', JSON.stringify({ event: {} }));
    req.emit('end');
  };

  it('should use AWS_DEFAULT_REGION 1st', function (done) {
      test_region({
          AWS_DEFAULT_REGION: "xx-default-1",
          AWS_REGION: "xx-awsregion-2",
          AMAZON_REGION: "xx-amazonregion-3",
      }, "xx-default-1", done);
  });

  it('should use AWS_REGION 2nd', function (done) {
      test_region({
          // AWS_DEFAULT_REGION: undefined,
          AWS_REGION: "xx-awsregion-2",
          AMAZON_REGION: "xx-amazonregion-3",
      }, "xx-awsregion-2", done);
  });

  it('should use AMAZON_REGION 3rd', function (done) {
      test_region({
          // AWS_DEFAULT_REGION: undefined,
          // AWS_REGION: "xx-awsregion-2",
          AMAZON_REGION: "xx-amazonregion-3",
      }, "xx-amazonregion-3", done);
  });

  it('should fall back to a dummy region', function (done) {
      test_region({}, "xx-dummy-0", done);
  });

});
