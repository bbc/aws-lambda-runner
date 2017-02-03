# -*- encoding: utf-8 -*-
$LOAD_PATH.push File.expand_path('../lib', __FILE__)

Gem::Specification.new do |s|
  s.name        = 'aws-lambda-runner'
  s.version     = '1.5.0'
  s.date        = '2017-02-03'
  s.summary     = 'AWS Lambda testing helper'
  s.description = 'Trigger AWS Lambda functions without deploying to AWS'
  s.homepage    = 'https://github.com/bbc/aws-lambda-runner'
  s.license     = 'Apache-2.0'
  s.authors     = ['andrew wheat', 'tristan hill', 'stuart hicks', 'rachel evans']
  s.email       = []

  s.files       = Dir['lib/**/*.rb', 'samples/*.json', 'js/*.json', 'js/*.js', 'spec/*.rb']
  s.executables = s.files.grep(%r{^bin/}) { |f| File.basename(f) }

  s.test_files  = %w( )

  s.require_paths = ['lib']

  s.add_dependency 'process-helper', '~> 1'
  s.add_dependency 'rest-client', '~> 1.0'
  s.add_dependency 'file_utils', '~> 1'
  s.add_development_dependency 'rspec', '~> 3.3'
  s.add_development_dependency 'rspec-core', '~> 3.3'
  s.add_development_dependency 'rspec-expectations', '~> 3.3'
  s.add_development_dependency 'rubocop', '~> 0'
  s.add_development_dependency 'minitest', '~> 5.0'
  s.add_development_dependency 'rake', '~> 10.0'
end
