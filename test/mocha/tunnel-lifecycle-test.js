const assert = require("assert");
const { EventEmitter } = require("events");
const provider = require("../../");

// A stand-in for testingbot-tunnel-launcher: records each start and close
function fakeLauncher(state, { fail = false } = {}) {
  return (options, callback) => {
    state.starts.push(options);

    setTimeout(() => {
      if (fail) return callback(new Error("tunnel failed to start"));

      const tunnel = new EventEmitter();

      tunnel.close = (done) => {
        state.closes += 1;
        setTimeout(done);
      };

      return callback(null, tunnel);
    });
  };
}

describe("Tunnel lifecycle", function () {
  const realLauncher = provider.tunnelLauncher;
  let state;

  beforeEach(function () {
    state = { starts: [], closes: 0 };
    provider.tunnelLauncher = fakeLauncher(state);
  });

  afterEach(async function () {
    await provider.stopTunnel();
    provider.tunnelLauncher = realLauncher;
  });

  it("starts a single tunnel for concurrent and repeated openBrowser calls", async function () {
    const [first, second] = await Promise.all([
      provider.startTunnel(),
      provider.startTunnel(),
    ]);
    const third = await provider.startTunnel();

    assert.strictEqual(state.starts.length, 1);
    assert.strictEqual(first, second);
    assert.strictEqual(first, third);
    assert.strictEqual(
      state.starts[0].tunnelIdentifier,
      provider.tunnelIdentifier,
    );
  });

  it("closes the tunnel on dispose, even while it is still starting", async function () {
    provider.startTunnel();
    await provider.dispose();

    assert.strictEqual(state.starts.length, 1);
    assert.strictEqual(state.closes, 1);
    assert.strictEqual(provider.tunnel, null);
    assert.strictEqual(provider.tunnelIdentifier, null);
  });

  it("does not cache a failed start", async function () {
    provider.tunnelLauncher = fakeLauncher(state, { fail: true });
    await assert.rejects(provider.startTunnel(), /failed to start/);

    provider.tunnelLauncher = fakeLauncher(state);
    await provider.startTunnel();

    assert.strictEqual(state.starts.length, 2);
    assert.ok(provider.tunnel);
  });

  it("quits the sessions and closes the tunnel on SIGINT", async function () {
    await provider.startTunnel();

    let quits = 0;

    provider.openedBrowsers["fake"] = {
      quit: async () => {
        quits += 1;
      },
    };

    // Keep this test process alive: with another listener present the
    // provider does not re-raise the signal
    const keepAlive = () => {};
    process.on("SIGINT", keepAlive);

    try {
      process.emit("SIGINT", "SIGINT");
      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.strictEqual(quits, 1);
      assert.deepStrictEqual(provider.openedBrowsers, {});
      assert.strictEqual(state.closes, 1);
      assert.strictEqual(provider.tunnel, null);
    } finally {
      process.removeListener("SIGINT", keepAlive);
    }
  });

  it("removes its signal handlers once the tunnel is closed", async function () {
    const before = process.listenerCount("SIGTERM");

    await provider.startTunnel();
    assert.strictEqual(process.listenerCount("SIGTERM"), before + 1);

    await provider.stopTunnel();
    assert.strictEqual(process.listenerCount("SIGTERM"), before);
  });

  it("passes TB_TUNNEL_VERSION to the launcher", async function () {
    process.env.TB_TUNNEL_VERSION = "4.9";

    try {
      await provider.startTunnel();
    } finally {
      delete process.env.TB_TUNNEL_VERSION;
    }

    assert.strictEqual(state.starts[0].tunnelVersion, "4.9");
  });

  it("abandons an openBrowser that is still waiting for the tunnel when disposed", async function () {
    const env = {
      TB_KEY: process.env.TB_KEY,
      TB_SECRET: process.env.TB_SECRET,
    };

    process.env.TB_KEY = env.TB_KEY || "key";
    process.env.TB_SECRET = env.TB_SECRET || "secret";

    try {
      // Settle into a value right away, so the rejection is never unhandled
      const outcome = provider
        .openBrowser("late", "http://localhost/connect", "chrome@latest:WIN11")
        .then(
          () => null,
          (error) => error,
        );

      await provider.dispose();

      const error = await outcome;

      assert.match(String(error), /disposed while opening the browser/);

      assert.deepStrictEqual(provider.openedBrowsers, {});
      assert.strictEqual(state.closes, 1);
    } finally {
      for (const name in env) {
        if (env[name] === undefined) delete process.env[name];
        else process.env[name] = env[name];
      }
    }
  });
});
