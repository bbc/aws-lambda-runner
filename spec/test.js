module.exports.node_0_10_42_handler = function (event, context) {
  console.log("test handler received event =", JSON.stringify(event));

  if (event.succeed) {
    var delay = event.succeed.delay || 0;
    var result = event.succeed.result || null;
    setTimeout(function () {
      context.done(null, result);
    }, delay);
  }

  if (event.fail) {
    var delay = event.fail.delay || 0;
    var err = event.fail.err || true;
    setTimeout(function () {
      context.done(err);
    }, delay);
  }
};
