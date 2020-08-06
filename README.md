# testcafe-browser-provider-testingbot
[![Build Status](https://travis-ci.org/testingbot/testcafe-browser-provider-testingbot.svg)](https://travis-ci.org/testingbot/testcafe-browser-provider-testingbot)

This plugin integrates [TestCafe](http://devexpress.github.io/testcafe) with the [TestingBot Testing Cloud](https://testingbot.com).

## Install

```
npm install testcafe-browser-provider-testingbot
```

## Usage
Before you can use this plugin, you will need to get the TestingBot key and secret from the TestingBot member area.
Once you have these two credentials, add these as environment variables`TB_KEY` and `TB_SECRET`.

You can determine the available browser aliases by running
```
testcafe -b testingbot
```

When you run tests from the command line, use the alias when specifying browsers:

```
testcafe "testingbot:chrome@83:WIN10" 'path/to/test/file.js'
```

If you'd like to run a test on multiple browsers, simultaneously:

```
testcafe "testingbot:chrome@83:WIN10","testingbot:firefox@79:CATALINA" 'path/to/test/file.js'
```

When you use API, pass the alias to the `browsers()` method:

```js
testCafe
    .createRunner()
    .src('path/to/test/file.js')
    .browsers('testingbot:chrome@83:WIN10')
    .run();
```

## Configuration

Use the following environment variables to set additional configuration options:

 - `TB_TEST_NAME` - the text that will be displayed as Test Name on TestingBot.

 - `TB_BUILD` - the text that will be displayed as Build Name on TestingBot.

 - `SELENIUM_CAPABILITIES` - path to a file which contains a JSON formatted object with the capabilities you want to use.
 
 - `TB_CI_MODE` - set this variable to `1` when you are using this plugin in a CI context with a TestingBot CI plugin.
 
 - `TB_SCREEN_RESOLUTION` - allows setting the screen resolution for desktop browsers in the `${width}x${height}` format, has no effect when specified for a mobile browser.
 
 - `SELENIUM_HEARTBEAT` - this plugin will by default send a heartbeat every 8 seconds, to keep the WebDriver session open. Use this variable to change this interval.
 
Example:
```sh
export TB_SCREEN_RESOLUTION="1920x1080"
export TB_TEST_NAME="E2E TestCafe"
export TB_BUILD="Build 42"
testcafe testingbot:safari,testingbot:chrome tests/
```

## Selenium Capabilities file

You can use a [capabilities.json](capabilities.json) file which contains a JSON object with capabilities you want to use.
Each key in this json file can be used as a parameter. For example, if you have a `chrome` key in this file, then the following command
will send the capabilities for this key to the TestingBot grid:

```sh
testcafe testingbot:chrome tests/
```

## Build Plugin Locally (Development Mode)

1. Clone this repository
2. Install Packages and Test/Build
```sh
$ npm i
$ npm run test
```
3. Link Testcafe with this plugin
```sh
$ sudo npm link
```

## About TestingBot
[TestingBot](https://testingbot.com) provides a cloud of +2500 browsers and physical mobile devices. This cloud hosted Selenium grid is 100% compatible with all frameworks and Selenium/Appium bindings. Take advantage of high concurrency [selenium testing](https://testingbot.com/features) in the cloud.
