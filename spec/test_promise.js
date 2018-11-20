// native Promises are supported from Node.js 6.10 on AWS lambdas

module.exports.handler = function (event, context) {

    if (event.succeed) {
        const delay = event.succeed.delay;
        const result = event.succeed.result;

        return new Promise((resolve) => setTimeout(resolve,delay))
            .then(() => result)
    }

    if (event.fail) {
        const delay = event.fail.delay;
        const err = event.fail.err;

        return new Promise((resolve) => setTimeout(resolve,delay))
            .then(() => {
                throw new Error(err)
            });
    }
};







