"use strict";
const assert = require("assert");
const provider = require("../../");

describe("Browser names", function () {
  before(function () {
    this.timeout(20000);

    return provider.init();
  });

  it("Should return list of common browsers and devices", function () {
    return provider.getBrowserList().then(function (list) {
      const commonBrowsers = [
        "chrome@56:BIGSUR",
        "firefox@77:WIN10",
        "internet explorer@11:WIN10",
      ];

      const areBrowsersInList = commonBrowsers.map(function (browser) {
        return list.indexOf(browser) > -1;
      });

      assert.deepStrictEqual(
        areBrowsersInList,
        Array(commonBrowsers.length).fill(true),
      );
    });
  });
});
