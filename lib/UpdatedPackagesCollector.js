"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _GitUtilities = require("./GitUtilities");

var _GitUtilities2 = _interopRequireDefault(_GitUtilities);

var _progressBar = require("./progressBar");

var _progressBar2 = _interopRequireDefault(_progressBar);

var _logger = require("./logger");

var _logger2 = _interopRequireDefault(_logger);

var _lodash = require("lodash.find");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Update = function Update(pkg) {
  _classCallCheck(this, Update);

  this.package = pkg;
};

var UpdatedPackagesCollector = function () {
  function UpdatedPackagesCollector(packages, packageGraph, flags) {
    _classCallCheck(this, UpdatedPackagesCollector);

    this.packages = packages;
    this.packageGraph = packageGraph;
    this.flags = flags;
  }

  _createClass(UpdatedPackagesCollector, [{
    key: "getUpdates",
    value: function getUpdates() {
      this.updatedPackages = this.collectUpdatedPackages();
      this.dependents = this.collectDependents();
      return this.collectUpdates();
    }
  }, {
    key: "collectUpdatedPackages",
    value: function collectUpdatedPackages() {
      var _this = this;

      _logger2.default.info("Checking for updated packages...");
      _progressBar2.default.init(this.packages.length);

      var hasTags = _GitUtilities2.default.hasTags();
      var commits = void 0;

      if (this.flags.canary) {
        var currentSHA = void 0;

        if (this.flags.canary !== true) {
          currentSHA = this.flags.canary;
        } else {
          currentSHA = _GitUtilities2.default.getCurrentSHA();
        }

        commits = this.getAssociatedCommits(currentSHA);
      } else if (hasTags) {
        commits = _GitUtilities2.default.describeTag(_GitUtilities2.default.getLastTaggedCommit());
      }

      var updatedPackages = {};

      this.packages.filter(function (pkg) {
        _progressBar2.default.tick(pkg.name);

        if (pkg.isPrivate()) {
          return false;
        }

        if (!hasTags) {
          return true;
        }

        var forceVersion = (_this.flags.forceVersion || "").split(",");

        if (forceVersion.indexOf("*") > -1) {
          return true;
        } else if (forceVersion.indexOf(pkg.name) > -1) {
          return true;
        } else {
          return !!_GitUtilities2.default.diffSinceIn(commits, pkg.location);
        }
      }).forEach(function (pkg) {
        updatedPackages[pkg.name] = pkg;
      });

      _progressBar2.default.terminate();

      return updatedPackages;
    }
  }, {
    key: "isPackageDependentOf",
    value: function isPackageDependentOf(packageName, dependency) {
      var _this2 = this;

      var dependencies = this.packageGraph.get(packageName).dependencies;

      if (dependencies.indexOf(dependency) > -1) {
        return true;
      }

      return !!(0, _lodash2.default)(dependencies, function (dep) {
        return _this2.isPackageDependentOf(dep, dependency);
      });
    }
  }, {
    key: "collectDependents",
    value: function collectDependents() {
      var _this3 = this;

      var dependents = {};

      this.packages.forEach(function (pkg) {
        Object.keys(_this3.updatedPackages).forEach(function (dependency) {
          if (_this3.isPackageDependentOf(pkg.name, dependency)) {
            dependents[pkg.name] = pkg;
          }
        });
      });

      return dependents;
    }
  }, {
    key: "collectUpdates",
    value: function collectUpdates() {
      var _this4 = this;

      return this.packages.filter(function (pkg) {
        return _this4.updatedPackages[pkg.name] || _this4.dependents[pkg.name] || _this4.flags.canary;
      }).map(function (pkg) {
        return new Update(pkg);
      });
    }
  }, {
    key: "getAssociatedCommits",
    value: function getAssociatedCommits(sha) {
      // if it's a merge commit, it will return all the commits that were part of the merge
      // ex: If `ab7533e` had 2 commits, ab7533e^..ab7533e would contain 2 commits + the merge commit
      return sha.slice(0, 8) + "^.." + sha.slice(0, 8);
    }
  }]);

  return UpdatedPackagesCollector;
}();

exports.default = UpdatedPackagesCollector;