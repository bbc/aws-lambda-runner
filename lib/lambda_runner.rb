require 'process-helper'
require 'rest-client'
require 'json'
require 'English'
require 'fileutils'

# runs a nodejs lambda program so the s3 events can be sent to it via http post
module LambdaRunner
  # abstract for running the program
  class Runner
    def initialize(module_path, name, port = 0)
      @module_path = module_path
      @name = name
      @port = port
    end

    def install_deps
      @npm_cwd = File.expand_path('../../js/', __FILE__)
      STDOUT.puts("trying to use npm install in #{@npm_cwd}")
      npm_install_pid = spawn('npm', 'install', chdir: @npm_cwd)
      Process.wait(npm_install_pid)
      fail 'failed to install the lambda startup' if ($CHILD_STATUS.exitstatus != 0)
    end

    def add_aws_sdk
      STDOUT.puts("Copying aws-sdk into the lambda function's node_modules.")
      FileUtils.cp_r File.expand_path('../../js/node_modules/aws-sdk', __FILE__), "#{File.dirname(@module_path)}/node_modules"
    end

    def start(opts = { cover: true })
      if opts[:timeout] == nil
        opts[:timeout] = '30000'
      end
      install_deps
      #copy over aws sdk only if it is not already there
      if !File.directory?("#{File.dirname(@module_path)}/node_modules/aws-sdk")
        add_aws_sdk
      end
      # start node in a way that emulates how it's run in production
      cmd = ['node']
      cmd = [File.join(@npm_cwd, 'node_modules/.bin/istanbul'), 'cover', '--root', File.dirname(@module_path), '--'] if opts[:cover]
      cmd += [File.join(@npm_cwd, 'startup.js'), '-p', @port.to_s, '-m', @module_path, '-h', @name, '-t', opts[:timeout]]
      @proc = ProcessHelper::ProcessHelper.new(print_lines: true)
      @proc.start(cmd, 'Server running at http:\S+')

      # Annoyingly @proc.start doesn't seem to make the matching pattern
      # available, so we match again:
      log = @proc.get_log(:out).join("")
      if m = log.match(/^Server running at (http:\S+)/)
        @url = m[1]
      else
        raise "Couldn't find node test URL in log: #{log}"
      end
    end

    def url
      @url
    end

    def process_event(event, context = {})
      payload = JSON.generate({ event: event, context: context })
      id = RestClient.post(url, payload, content_type: :json).to_str
      loop do
        response = RestClient.get(url, params: { id: id }) {|response, request, res| response}
        data = JSON.parse('['+response.body+']').first

        case response.code
        when 200 then sleep(0.1)
        when 201 then return data
        when 500 then fail data
        when 502 then fail data
        when 504 then fail 'timeout'
        else fail "unknown response #{response.code}"
        end
      end
    end

    def stop
      RestClient.delete(url)
    end
  end

  # aws events
  class Events
    def self.s3_event(bucket, key, eventName='ObjectCreated:Put')
      event = load_json('sample_s3_event.json')
      event['Records'].each do |record|
        record['eventName'] = eventName
        record['s3']['bucket'].update('name' => bucket,
                                      'arn' => 'arn:aws:s3:::' + bucket)
        record['s3']['object']['key'] = key
        record
      end
      event
    end

    def self.sns_event(topicArn, messageId, timestamp, messageBody)
      unless messageBody.kind_of? String
        messageBody = JSON.generate messageBody
      end

      event = load_json('sample_sns_event.json')
      event['Records'].each do |record|
        record['Sns']['TopicArn'] = topicArn
        record['Sns']['MessageId'] = messageId
        record['Sns']['Timestamp'] = timestamp
        record['Sns']['Message'] = messageBody
      end
      event
    end

    def self.dynamodb_event(key, new_image = nil, old_image = nil)
      event = load_json('sample_dynamodb_event.json')
      get_dynamodb_record(event['Records'][0], key, new_image, old_image)
      event
    end

    private_class_method def self.get_dynamodb_record(record, key, new_image, old_image)
      if new_image && old_image
        record['dynamodb']['NewImage'] = new_image['NewImage']
        record['dynamodb']['OldImage'] = old_image['OldImage']
        record['eventName'] = 'MODIFY'
      elsif new_image
        record['dynamodb']['NewImage'] = new_image['NewImage']
        record['eventName'] = 'INSERT'
      else
        record['dynamodb']['OldImage'] = old_image['OldImage']
        record['eventName'] = 'REMOVE'
      end
      record['dynamodb']['Keys'] = key
      record
    end

    private

    def self.load_json(name)
      base = File.dirname(File.dirname(__FILE__))
      File.open(File.join(base, "samples", name)) { |file| return JSON.load(file) }
    end

  end
end

# vi: tabstop=2:softtabstop=2:shiftwidth=2:expandtab
