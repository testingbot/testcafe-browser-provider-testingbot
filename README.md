# testcafe-browser-provider-testingbot
[![Build Status](https://travis-ci.org/testingbot/testcafe-browser-provider-testingbot.svg)](https://travis-ci.org/testingbot/testcafe-browser-provider-testingbot)

This is the **testingbot** browser provider plugin for [TestCafe](http://devexpress.github.io/testcafe).

## Install

```
npm install testcafe-browser-provider-testingbot
```

## Usage


You can determine the available browser aliases by running
```
testcafe -b testingbot
```

When you run tests from the command line, use the alias when specifying browsers:

```
testcafe testingbot:browser1 'path/to/test/file.js'
```


When you use API, pass the alias to the `browsers()` method:

```js
testCafe
    .createRunner()
    .src('path/to/test/file.js')
    .browsers('testingbot:browser1')
    .run();
```

## Author
TestingBot (https://testingbot.com)
