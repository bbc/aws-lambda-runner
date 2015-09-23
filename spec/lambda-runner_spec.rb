require 'rspec'
require_relative '../lib/lambda_runner'

describe LambdaRunner::Events do

  it "should generate an S3 event" do
    json = LambdaRunner::Events.s3_event("some-bucket", "some/key", "local/path")
    data = JSON.parse json
    expect(data["Records"][0]["file"]["path"]).to eq("local/path")
    expect(data["Records"][0]["s3"]["bucket"]["name"]).to eq("some-bucket")
    expect(data["Records"][0]["s3"]["bucket"]["arn"]).to eq("arn:aws:s3:::some-bucket")
    expect(data["Records"][0]["s3"]["object"]["key"]).to eq("some/key")
  end

  it "should generate an SNS event" do
    json = LambdaRunner::Events.sns_event("some-arn", "some-id", "some-timestamp", "some-body")
    data = JSON.parse json
    expect(data["Records"][0]["Sns"]["TopicArn"]).to eq("some-arn")
    expect(data["Records"][0]["Sns"]["MessageId"]).to eq("some-id")
    expect(data["Records"][0]["Sns"]["Timestamp"]).to eq("some-timestamp")
    expect(data["Records"][0]["Sns"]["Message"]).to eq("some-body")
  end

end
