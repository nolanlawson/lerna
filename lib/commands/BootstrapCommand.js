"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _FileSystemUtilities = require("../FileSystemUtilities");

var _FileSystemUtilities2 = _interopRequireDefault(_FileSystemUtilities);

var _NpmUtilities = require("../NpmUtilities");

var _NpmUtilities2 = _interopRequireDefault(_NpmUtilities);

var _PackageUtilities = require("../PackageUtilities");

var _PackageUtilities2 = _interopRequireDefault(_PackageUtilities);

var _Command2 = require("../Command");

var _Command3 = _interopRequireDefault(_Command2);

var _semver = require("semver");

var _semver2 = _interopRequireDefault(_semver);

var _async = require("async");

var _async2 = _interopRequireDefault(_async);

var _lodash = require("lodash.find");

var _lodash2 = _interopRequireDefault(_lodash);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BootstrapCommand = function (_Command) {
  _inherits(BootstrapCommand, _Command);

  function BootstrapCommand() {
    _classCallCheck(this, BootstrapCommand);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(BootstrapCommand).apply(this, arguments));
  }

  _createClass(BootstrapCommand, [{
    key: "initialize",
    value: function initialize(callback) {
      // Nothing to do...
      callback(null, true);
    }
  }, {
    key: "execute",
    value: function execute(callback) {
      var _this2 = this;

      this.linkDependencies(function (err) {
        if (err) {
          callback(err);
        } else {
          _this2.logger.success("Successfully bootstrapped " + _this2.packages.length + " packages.");
          callback(null, true);
        }
      });
    }
  }, {
    key: "linkDependencies",
    value: function linkDependencies(callback) {
      var _this3 = this;

      this.progressBar.init(this.packages.length);
      this.logger.info("Linking all dependencies");

      var ignore = this.flags.ignore || this.repository.bootstrapConfig.ignore;

      // Get a filtered list of packages that will be bootstrapped.
      var todoPackages = _PackageUtilities2.default.filterPackages(this.packages, ignore, true);

      // Get a trimmed down graph that includes only those packages.
      var filteredGraph = _PackageUtilities2.default.getPackageGraph(todoPackages);

      // As packages are completed their names will go into this object.
      var donePackages = {};

      // Bootstrap runs the "prepublish" script in each package.  This script
      // may _use_ another package from the repo.  Therefore if a package in the
      // repo depends on another we need to bootstrap the dependency before the
      // dependent.  So the bootstrap proceeds in batches of packages where each
      // batch includes all packages that have no remaining un-bootstrapped
      // dependencies within the repo.
      var bootstrapBatch = function bootstrapBatch() {

        // Get all packages that have no remaining dependencies within the repo
        // that haven't yet been bootstrapped.
        var batch = todoPackages.filter(function (pkg) {
          var node = filteredGraph.get(pkg.name);
          return !node.dependencies.filter(function (dep) {
            return !donePackages[dep];
          }).length;
        });

        _async2.default.parallelLimit(batch.map(function (pkg) {
          return function (done) {
            _async2.default.series([function (cb) {
              return _FileSystemUtilities2.default.mkdirp(pkg.nodeModulesLocation, cb);
            }, function (cb) {
              return _this3.installExternalPackages(pkg, cb);
            }, function (cb) {
              return _this3.linkDependenciesForPackage(pkg, cb);
            }, function (cb) {
              return _this3.runPrepublishForPackage(pkg, cb);
            }], function (err) {
              _this3.progressBar.tick(pkg.name);
              donePackages[pkg.name] = true;
              todoPackages.splice(todoPackages.indexOf(pkg), 1);
              done(err);
            });
          };
        }), _this3.concurrency, function (err) {
          if (todoPackages.length && !err) {
            bootstrapBatch();
          } else {
            _this3.progressBar.terminate();
            callback(err);
          }
        });
      };

      // Kick off the first batch.
      bootstrapBatch();
    }
  }, {
    key: "runPrepublishForPackage",
    value: function runPrepublishForPackage(pkg, callback) {
      if ((pkg.scripts || {}).prepublish) {
        _NpmUtilities2.default.runScriptInDir("prepublish", [], pkg.location, callback);
      } else {
        callback();
      }
    }
  }, {
    key: "linkDependenciesForPackage",
    value: function linkDependenciesForPackage(pkg, callback) {
      var _this4 = this;

      _async2.default.each(this.packages, function (dependency, done) {
        if (!_this4.hasMatchingDependency(pkg, dependency, true)) return done();

        var linkSrc = dependency.location;
        var linkDest = _path2.default.join(pkg.nodeModulesLocation, dependency.name);

        _this4.createLinkedDependency(linkSrc, linkDest, dependency.name, done);
      }, callback);
    }
  }, {
    key: "createLinkedDependency",
    value: function createLinkedDependency(src, dest, name, callback) {
      var _this5 = this;

      _FileSystemUtilities2.default.rimraf(dest, function (err) {
        if (err) {
          return callback(err);
        }

        _FileSystemUtilities2.default.mkdirp(dest, function (err) {
          if (err) {
            return callback(err);
          }

          _this5.createLinkedDependencyFiles(src, dest, name, callback);
        });
      });
    }
  }, {
    key: "createLinkedDependencyFiles",
    value: function createLinkedDependencyFiles(src, dest, name, callback) {
      var destIndexJsLocation = _path2.default.join(dest, "index.js");

      var moduleJsFileContents = "export * from " + JSON.stringify(src + '/src/index') + ";";

      _FileSystemUtilities2.default.writeFile(destIndexJsLocation, moduleJsFileContents, callback);
    }
  }, {
    key: "installExternalPackages",
    value: function installExternalPackages(pkg, callback) {
      var _this6 = this;

      var allDependencies = pkg.allDependencies;

      var externalPackages = Object.keys(allDependencies).filter(function (dependency) {
        var match = (0, _lodash2.default)(_this6.packages, function (pkg) {
          return pkg.name === dependency;
        });

        return !(match && _this6.hasMatchingDependency(pkg, match));
      }).filter(function (dependency) {
        return !_this6.hasDependencyInstalled(pkg, dependency);
      }).map(function (dependency) {
        return dependency + "@" + allDependencies[dependency];
      });

      if (externalPackages.length) {
        _NpmUtilities2.default.installInDir(pkg.location, externalPackages, callback);
      } else {
        callback();
      }
    }
  }, {
    key: "hasMatchingDependency",
    value: function hasMatchingDependency(pkg, dependency) {
      var showWarning = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

      var expectedVersion = pkg.allDependencies[dependency.name];
      var actualVersion = dependency.version;

      if (!expectedVersion) {
        return false;
      }

      if (this.isCompatableVersion(actualVersion, expectedVersion)) {
        return true;
      }

      if (showWarning) {
        this.logger.warning("Version mismatch inside \"" + pkg.name + "\". " + ("Depends on \"" + dependency.name + "@" + expectedVersion + "\" ") + ("instead of \"" + dependency.name + "@" + actualVersion + "\"."));
      }

      return false;
    }
  }, {
    key: "hasDependencyInstalled",
    value: function hasDependencyInstalled(pkg, dependency) {
      var packageJson = _path2.default.join(pkg.nodeModulesLocation, dependency, "package.json");
      try {
        return this.isCompatableVersion(require(packageJson).version, pkg.allDependencies[dependency]);
      } catch (e) {
        return false;
      }
    }
  }, {
    key: "isCompatableVersion",
    value: function isCompatableVersion(actual, expected) {
      return _semver2.default.satisfies(actual, expected);
    }
  }]);

  return BootstrapCommand;
}(_Command3.default);

exports.default = BootstrapCommand;
module.exports = exports["default"];