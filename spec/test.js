module.exports.handler_method = function (event, context, callback) {
  console.log("test handler received event =", JSON.stringify(event));

  if (event.succeed) {
    var delay = event.succeed.delay || 0;
    var result = event.succeed.result || null;
    setTimeout(function () {
      callback(null, result);
    }, delay);
  }

  if (event.fail) {
    var delay = event.fail.delay || 0;
    var err = event.fail.err || true;
    setTimeout(function () {
      callback(err);
    }, delay);
  }
};
