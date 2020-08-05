import { Builder } from 'selenium-webdriver';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const testingbotTunnel = require('testingbot-tunnel-launcher');
const Promise = require('promise');
const TestingbotApi = require('testingbot-api');

function _findMatch (string, re) {
    const match = string.match(re);

    return match ? match[1].trim() : '';
}

function _formalName (browser) {
    // browser names should respect selenium's definition
    switch (browser) {
        case 'ie':
            return 'internet explorer';
        case 'googlechrome':
            return 'chrome';
        case 'edge':
            return 'MicrosoftEdge';
        default:
            return browser;
    }
}

export default {
    // Multiple browsers support
    isMultiBrowser:    true,
    seleniumServer:    'https://hub.testingbot.com/wd/hub',
    openedBrowsers:    {},
    heartbeatHandler:  {},
    heartbeatInterval: Number(process.env.SELENIUM_HEARTBEAT) || 8000,
    capabilities:      process.env.SELENIUM_CAPABILITIES || 'capabilities.json',
    tbKey:             null,
    tbSecret:          null,
    tunnel:            null,
    apiClient:         null,
    tunnelIdentifier:  null,


    /**
     * Open the browser with the given parameters
     * @param {number} id id of the opened browser
     * @param {string} pageUrl url to navigate to after creating browser
     * @param {string} browserName browser string in format 'browserName[@version][:platform]'
     */
    async openBrowser (id, pageUrl, browserName) {
        if (!browserName)
            throw new Error('Browser not specified!');

        if (!process.env.TB_KEY || !process.env.TB_SECRET)
            throw new Error('Please specify both TB_KEY and TB_SECRET environment variables. You can find these two keys in the TestingBot member area.');

        if (!process.env['TB_SKIP_TUNNEL'])
            this.tunnel = await this.startTunnel();

        let caps = {
            'tb:options': {
                'tunnel-identifier': this.tunnelIdentifier,
                'key':               this.tbKey,
                'secret':            this.tbSecret,
                'name':              `TestCafe test run ${id}`
            }
        };

        if (this.tunnelIdentifier === null)
            delete caps['tb:options']['tunnel-identifier'];

        const browserProfile = _findMatch(browserName, /([^@:]+)/);
        const browser = _findMatch(browserProfile, /([^#]+)/);
        const version = _findMatch(browserName, /@([^:]+)/);
        const platform = _findMatch(browserName, /:(.+)/);

        let manualCaps = true;

        if (existsSync(this.capabilities)) {
            const capsJson = JSON.parse(readFileSync(this.capabilities));

            if (capsJson && capsJson[browserName]) {
                manualCaps = false;
                // here we fetch the capabilities from the capabilities.json file instead
                // of taking the capabilities passed
                caps = Object.assign(caps, capsJson[browserName]);
            }
        }

        if (manualCaps) {
            if (platform && platform.length > 0)
                caps['platformName'] = platform;

            if (version && version.length > 0)
                caps['browserVersion'] = version;

            if (browser && browser.length > 0)
                caps['browserName'] = browser;

        }

        if (!caps['browserName'])
            throw new Error('Invalid browserName. Can not start session.');

        if (process.env['TB_TEST_NAME'])
            caps['tb:options'].name = process.env['TB_TEST_NAME'];

        if (process.env['TB_BUILD'])
            caps['tb:options'].build = process.env['TB_BUILD'];

        if (process.env['TB_SCREEN_RESOLUTION'])
            caps['tb:options']['screen-resolution'] = process.env['TB_SCREEN_RESOLUTION'];

        const builder = new Builder().withCapabilities(caps).usingServer(this.seleniumServer);

        const webDriver = await builder.build();

        await webDriver.get(pageUrl);
        this.openedBrowsers[id] = webDriver;

        const session = await this.openedBrowsers[id].getSession();
        const sessionId = session.getId();

        if (session) {
            const sessionUrl = `https://testingbot.com/members/tests/${sessionId}`;
            
            this.setUserAgentMetaInfo(id, sessionUrl);
        }

        if (this.heartbeatInterval > 0)
            this.startHeartbeat(id, webDriver);
    },

    async startTunnel () {
        this.tunnelIdentifier = process.env.TB_TUNNEL_IDENTIFIER || 'testcafe-' + new Date().getTime();

        return new Promise((resolve, reject) => {
            testingbotTunnel({
                apiKey:              this.tbKey,
                apiSecret:           this.tbSecret,
                'tunnel-identifier': this.tunnelIdentifier
            }, function (err, tunnel) {
                if (err)
                    return reject(err);

                return resolve(tunnel);
            });
        });
    },

    async stopTunnel () {
        if (!this.tunnel) {
            return new Promise((reject) => {
                reject('Tunnel already closed');
            });
        }

        const ctx = this;

        return new Promise((resolve) => {
            this.tunnel.close(function () {
                ctx.tunnel = null;
                resolve(true);
            });
        });
    },

    async closeBrowser (id) {
        if (this.heartbeatInterval > 0)
            this.stopHeartbeat(id);

        if (this.openedBrowsers[id])
            await this.openedBrowsers[id].quit();

        delete this.openedBrowsers[id];
    },

    sleep (time) {
        return new Promise(function (resolve) {
            setTimeout(function () {
                resolve();
            }, time);
        });
    },

    async startHeartbeat (id, browser) {
        this.heartbeatHandler[id] = true;
        while (this.heartbeatHandler[id]) {
            try {
                // send a command to hub to keep session
                await browser.getTitle();
            }
            catch (error) {
                // ignore error
            }
            await this.sleep(this.heartbeatInterval);
        }
    },

    stopHeartbeat (id) {
        this.heartbeatHandler[id] = false;
    },


    // Optional - implement methods you need, remove other methods
    // Initialization
    async init () {
        this.tbKey = process.env.TB_KEY;
        this.tbSecret = process.env.TB_SECRET;

        this.apiClient = new TestingbotApi({
            api_key:    this.tbKey,
            api_secret: this.tbSecret
        });
    },

    async dispose () {
        // ensure every session is closed on process exit
        for (const id in this.openedBrowsers) {
            try {
                await this.closeBrowser(id);
            }
            catch (error) {
                // browser has already been closed
            }
        }

        if (this.tunnel)
            await this.stopTunnel();
    },
    
    // Browser names handling
    async getBrowserList () {
        return new Promise((resolve, reject) => {
            this.apiClient.getBrowsers(function (error, browsers) {
                if (error)
                    return reject(error);

                const browserList = browsers.filter(browser => !browser.deviceName).map(browser => {
                    return `${_formalName(browser.name)}@${browser.version}:${browser.platform}`;
                });

                return resolve(browserList);
            });
        });
    },

    async isValidBrowserName (/*browserName*/) {
        return true;
    },
    
    // Extra methods
    async canResizeWindowToDimensions (/* browserId, width, height */) {
        return true;
    },

    getCorrectedSize (currentClientAreaSize, currentWindowSize, requestedSize) {
        var horizontalChrome = currentWindowSize.width - currentClientAreaSize.width;
        var verticalChrome   = currentWindowSize.height - currentClientAreaSize.height;

        return {
            width:  requestedSize.width + horizontalChrome,
            height: requestedSize.height + verticalChrome
        };
    },

    async resizeWindow (id, width, height, currentWidth, currentHeight ) {
        const currentWindowSize     = await this.openedBrowsers[id].getWindowSize();
        const currentClientAreaSize = { width: currentWidth, height: currentHeight };
        const requestedSize         = { width, height };
        const correctedSize         = this.getCorrectedSize(currentClientAreaSize, currentWindowSize, requestedSize);

        await this.openedBrowsers[id].setWindowSize(correctedSize.width, correctedSize.height);
    },

    async maximizeWindow (id) {
        // May need to install a window manager like fluxbox if this doesn't work for Chrome. https://github.com/SeleniumHQ/docker-selenium/issues/559
        // or the workaround will be to set capabilities to start maximized.
        await this.openedBrowsers[id].manage().window().maximize();
    },

    async takeScreenshot (id, screenshotPath/* , pageWidth, pageHeight */) {
        const screenshot = await this.openedBrowsers[id].takeScreenshot(screenshotPath);

        writeFileSync(screenshotPath, screenshot, 'base64');
    },

    async getVideoFrameData (id) {
        const screenshot = await this.openedBrowsers[id].takeScreenshot();

        return await Buffer.from(screenshot, 'base64');
    },

    async reportJobResult (id, jobResult, jobData) {
        if (jobResult !== this.JOB_RESULT.done && jobResult !== this.JOB_RESULT.errored)
            return null;

        if (this.openedBrowsers[id]) {
            const session = await this.openedBrowsers[id].getSession();
            const sessionId = session.getId();
            const jobPassed = jobResult === this.JOB_RESULT.done && jobData.total === jobData.passed;

            if (process.env['TB_CI_MODE']) {
                // eslint-disable-next-line
                console.log(`TestingBotSessionID=${sessionId}`)
            }

            return await this._updateJobStatus(sessionId, jobPassed);
        }

        return null;
    },

    async _updateJobStatus (sessionId, passed) {
        return new Promise((resolve, reject) => {
            const testData = { 'test[success]': passed ? '1' : '0' };

            this.apiClient.updateTest(testData, sessionId, function (error, testDetails) {
                if (error)
                    reject(error);
                else
                    resolve(testDetails);
            });
        });
    },

    async isLocalBrowser () {
        return false;
    }
};
