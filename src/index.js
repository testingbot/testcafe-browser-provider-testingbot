import { Builder } from 'selenium-webdriver';
import { writeFileSync, readFileSync, existsSync } from 'fs';

var testingbotTunnel = require('testingbot-tunnel-launcher');
var Promise = require('promise');

export default {
    // Multiple browsers support
    isMultiBrowser:    true,
    seleniumServer:    'https://hub.testingbot.com/wd/hub',
    openedBrowsers:    {},
    heartbeatHandler:  {},
    heartbeatInterval: Number(process.env.SELENIUM_HEARTBEAT) || 10e3,
    capabilities:      process.env.SELENIUM_CAPABILITIES || 'capabilities.json',
    tbKey:             null,
    tbSecret:          null,
    tunnel:            null,


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

        this.tbKey = process.env.TB_KEY;
        this.tbSecret = process.env.TB_SECRET;

        this.tunnel = await this.startTunnel();

        let caps = {
            'tb:options': {
                'tunnel-identifier': this.tunnelIdentifier,
                'key':               this.tbKey,
                'secret':            this.tbSecret
            }
        };

        if (existsSync(this.capabilities)) {
            const capsJson = JSON.parse(readFileSync(this.capabilities));

            if (capsJson && capsJson[browserName])
                caps = Object.assign(caps, capsJson[browserName]);
        }        

        const builder = new Builder().withCapabilities(caps).usingServer(this.seleniumServer);

        const webDriver = await builder.build();

        await webDriver.get(pageUrl);
        this.openedBrowsers[id] = webDriver;

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
        return;
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
        throw new Error('Not implemented!');
    },

    async isValidBrowserName (/*browserName*/) {
        return true;
    },
    
    // Extra methods
    async canResizeWindowToDimensions (/* browserId, width, height */) {
        return true;
    },

    async resizeWindow (id, width, height, /*currentWidth, currentHeight */) {
        await this.openedBrowsers[id].manage().window().setRect({ width: width, height: height });
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

    async reportJobResult (id, status, data) {
        if (this.openedBrowsers[id]) {
            const session = await this.openedBrowsers[id].getSession();
            const sessionId = session.getId();

            // eslint-disable-next-line
            console.log('sessionId', sessionId);
            return await this._updateJobStatus(sessionId, status, data);
        }
        return null;
    },

    async _updateJobStatus (sessionId, status, data) {
        // eslint-disable-next-line
        console.log('update job', sessionId, status, data);

        return true;
    },

    async isLocalBrowser () {
        return false;
    }
};
