## AWS Lambda Runner

Runs Lambda deployables locally, usually to test them off-line.


## License

This is licensed under the Apache 2.0 License


## Example usage

```ruby
undertest = LambdaRunner::Runner.new(File.expand_path('../path/to/handler.js', __FILE__), 'handler')

undertest.start

undertest.process_event LambdaRunner::Runner.s3_event('some-bucket', 'some-key', 'file-path-to-actual-content')
undertest.process_event LambdaRunner::Runner.sns_event('arn:::topic_name', 'message_uuid', '2015-04-02T07:36:57.451Z', 'message body')

undertest.stop
```

This will start a running the lambda deployable, then send two notifications to it, firstly a s3 trigger and secondly a sns trigger, In each case, it will block until either the function completes, times out or fails in an other way.


## Caveats & Known Issues

For a node.js deployment, you have to have done a `npm install` in your handler's directory if you are using any external libraries.
