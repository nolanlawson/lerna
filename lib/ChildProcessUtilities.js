"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _child_process = require("child_process");

var _child_process2 = _interopRequireDefault(_child_process);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ChildProcessUtilities = function () {
  function ChildProcessUtilities() {
    _classCallCheck(this, ChildProcessUtilities);
  }

  _createClass(ChildProcessUtilities, null, [{
    key: "exec",
    value: function exec(command, opts, callback) {
      return _child_process2.default.exec(command, opts, function (err, stdout, stderr) {
        if (err != null) {
          callback(err || stderr);
        } else {
          callback(null, stdout);
        }
      });
    }
  }, {
    key: "execSync",
    value: function execSync(command) {
      return _child_process2.default.execSync(command, {
        encoding: "utf8"
      }).trim();
    }
  }, {
    key: "spawn",
    value: function spawn(command, args, callback) {
      _child_process2.default.spawn(command, args, {
        stdio: "inherit"
      }).on("close", callback);
    }
  }]);

  return ChildProcessUtilities;
}();

exports.default = ChildProcessUtilities;