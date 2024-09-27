const nodeSpawn = require("cross-spawn");
const Promise = require("pinkie");

module.exports = function (cmd, args, envs) {
  return new Promise(function (resolve, reject) {
    const childProcess = nodeSpawn(cmd, args, {
      stdio: "inherit",
      shell: true,
      env: Object.assign({}, process.env, envs),
    });

    childProcess.on("exit", function (code) {
      if (code)
        reject(new Error("Process " + cmd + " exited with code: " + code));
      else resolve();
    });
  });
};
