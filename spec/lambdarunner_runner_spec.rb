require 'rspec'
require_relative '../lib/lambda_runner'

describe LambdaRunner::Runner do

  before(:all) do
    test_js = File.expand_path("test.js", File.dirname(__FILE__))
    @under_test = LambdaRunner::Runner.new(test_js, "node_4_3_handler")
    @under_test.start
  end

  after(:all) do
    @under_test.stop
  end

  it "should emulate AWS Lambda (node.js v4.3) - success" do
    r = @under_test.process_event({ succeed: { delay: 50, result: "ohai" } })
    expect(r).to eq("ohai")
  end

  it "should emulate AWS Lambda (node.js v4.3) - failure" do
    expect {
      @under_test.process_event({ fail: { delay: 50, err: "oh noes" } })
    }.to raise_error("oh noes")
  end

end
