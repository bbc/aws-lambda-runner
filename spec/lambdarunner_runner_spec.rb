require 'rspec'
require_relative '../lib/lambda_runner'


shared_examples "emulates AWS Lambda" do |lambda_file|

  before(:all) do
    test_js = File.expand_path(lambda_file, File.dirname(__FILE__))
    @under_test = LambdaRunner::Runner.new(test_js, "handler")
    @under_test.start
  end

  after(:all) do
    @under_test.stop
  end

  it "should emulate - success" do
    r = @under_test.process_event({ succeed: { delay: 50, result: "ohai" } })
    expect(r).to eq("ohai")
  end

  it "should emulate - failure" do
    expect {
      @under_test.process_event({ fail: { delay: 50, err: "oh noes" } })
    }.to raise_error("oh noes")
  end

end

describe LambdaRunner::Runner do

  it_should_behave_like "emulates AWS Lambda", "test_callback.js"
  it_should_behave_like "emulates AWS Lambda", "test_promise.js"
  it_should_behave_like "emulates AWS Lambda", "test_async.js"

end
