module.exports.handler = function (event, context, callback) {
  console.log("test handler received event =", JSON.stringify(event));

  if (event.succeed) {
    var delay = event.succeed.delay;
    var result = event.succeed.result;
    setTimeout(function () {
      callback(null, result);
    }, delay);
  }

  if (event.fail) {
    var delay = event.fail.delay;
    var err = event.fail.err;
    setTimeout(function () {
      callback(new Error(err));
    }, delay);
  }
};
