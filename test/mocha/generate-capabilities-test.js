const expect = require('chai').expect;
const sandbox = require('sinon').createSandbox();
const provider = require('../../');

describe('Internal generateCapabilities test', function () {
    const desktopUA = 'chrome@83:WIN10';

    before(function () {
        this.timeout(20000);
        return provider.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        return provider.dispose();
    });

    it('should generate basic desktop capabilities', async function () {
        const result = await provider.generateCapabilities(desktopUA, 1);

        expect(result.browserName).eql('chrome');
        expect(result.browserVersion).eql('83');
        expect(result.platformName).eql('WIN10');
    });

    it('should set the screen resolution from TB_SCREEN_RESOLUTION', async function () {
        sandbox.stub(process, 'env').value({ 'TB_SCREEN_RESOLUTION': '1920x1200' });

        const result = await provider.generateCapabilities(desktopUA, 1);

        expect(result.browserName).eql('chrome');
        expect(result.browserVersion).eql('83');
        expect(result.platformName).eql('WIN10');
        expect(result['tb:options']['screen-resolution']).eql('1920x1200');
    });
});