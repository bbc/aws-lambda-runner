// async await is supported on Node.js 8.10 on AWS lambdas

module.exports.handler = async (event, context) => {

    if (event.succeed) {
        const delay = event.succeed.delay;
        const result = event.succeed.result;

        return await new Promise((resolve) => setTimeout(resolve,delay))
            .then(() => result)
    }

    if (event.fail) {
        const delay = event.fail.delay || 0;
        const err = event.fail.err || true;

        return await new Promise((resolve) => setTimeout(resolve,delay))
            .then(() => {
                throw new Error(err)
            });
    }
};