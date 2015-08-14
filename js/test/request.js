
var request = require('../request.js');

var events = require('events');

var http = require('http');
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
  return done_response;
};

describe('request', function() {
  var req;
  var res;

  beforeEach(function(){
    req = post();
    res = new mockRes();
  });

  it('should accept a POST with data and run', function(done) {
    request.request(req, res, opts, function(data, context) {
      assert.equal(data, "hello world");
      var run_id = parseInt(res._getString());
      check_progress(run_id, 200);
      context.done(false, 'goodbye');
      check_progress(run_id, 201);

      done();
    });
    req.emit('data', '"hello world"');
    req.emit('end');
  });

  it('should accept multiple POSTs with data and run', function(done) {
    request.request(req, res, opts, function(data, context) {
      context.done(false, 'multiple: first');
      check_progress(parseInt(res._getString()), 201);
      done();
    });

    var req2 = post();
    var res2 = new mockRes();
    request.request(req2, res2, opts, function(data, context) {
      context.done(false, 'multiple: second');
      check_progress(parseInt(res2._getString()), 201);
      req.emit('data', '""');
      req.emit('end');
    });
    req2.emit('data', '""');
    req2.emit('end');
  });

  it('should signal an error', function(done) {
    request.request(req, res, opts, function(data, context) {
      var run_id = parseInt(res._getString());
      context.done('an error', 'goodbye');
      var res2 = check_progress(run_id, 502);
      assert.equal(res2._getString(), 'an error\n');
      done();
    });
    req.emit('data', '"hello world"');
    req.emit('end');
  });

  it('should timeout', function(done) {
    opts.timeout = 1;
    request.request(req, res, opts, function(data, context) {
      var run_id = parseInt(res._getString());
      setTimeout(function() {
        var res2 = new mockRes();
        request.request(new mockReq({method: 'GET', url: '/?id=' + run_id}), res2, opts, null);
        assert.equal(res2.statusCode, 504);
        done();
      }, 10);
    });
    req.emit('data', '"hello world"');
    req.emit('end');
  });

});
