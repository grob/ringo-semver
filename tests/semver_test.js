var assert = require("assert");
var semver = require("../lib/ringo/semver");

exports.testParseVersion = function() {
    assert.deepEqual(semver.parseVersion("1"), [1, null, null, null]);
    assert.deepEqual(semver.parseVersion("1.0"), [1, 0, null, null]);
    assert.deepEqual(semver.parseVersion("1.x"), [1, "x", null, null]);
    assert.deepEqual(semver.parseVersion("1.0.x"), [1, 0, "x", null]);
    assert.deepEqual(semver.parseVersion("1beta3"), [1, null, null, "beta3"]);
    assert.deepEqual(semver.parseVersion("1.1beta3"), [1, 1, null, "beta3"]);
    assert.deepEqual(semver.parseVersion("1.0.1beta3"), [1, 0, 1, "beta3"]);
    return;
};

exports.testParseRange = function() {
    assert.deepEqual(semver.parseRange("1"), [null, "1", null, null]);
    assert.deepEqual(semver.parseRange("> 1"), [">", "1", null, null]);
    assert.deepEqual(semver.parseRange(">= 1"), [">=", "1", null, null]);
    assert.deepEqual(semver.parseRange(">= 1.0.1beta"), [">=", "1.0.1beta", null, null]);
    assert.deepEqual(semver.parseRange(">= 1 <= 2"), [">=", "1", "<=", "2"]);
    assert.deepEqual(semver.parseRange("1 - 2"), [null, "1", null, "2"]);
};

exports.testSanitizeRange = function() {
    assert.deepEqual(semver.sanitizeRange("1"), [[">=", 100000000, null], ["<", 200000000, null]]);
    assert.deepEqual(semver.sanitizeRange("1.0"), [[">=", 100000000, null], ["<", 100010000, null]]);
    assert.deepEqual(semver.sanitizeRange("1.1"), [[">=", 100010000, null], ["<", 100020000, null]]);
    assert.deepEqual(semver.sanitizeRange("1.1.0"), [[">=", 100010000, null], ["<=", 100010000, null]]);
    assert.deepEqual(semver.sanitizeRange("1.1.1"), [[">=", 100010001, null], ["<=", 100010001, null]]);
    assert.deepEqual(semver.sanitizeRange("1.1.1 - 2"), [[">=", 100010001, null], ["<", 300000000, null]]);
    assert.deepEqual(semver.sanitizeRange("1.1.1 - 2.1"), [[">=", 100010001, null], ["<", 200020000, null]]);
    assert.deepEqual(semver.sanitizeRange("1.1.1 - 2.1.1"), [[">=", 100010001, null], ["<=", 200010001, null]]);
    assert.deepEqual(semver.sanitizeRange("1.1.1 - 2.1.1"), [[">=", 100010001, null], ["<=", 200010001, null]]);
    assert.deepEqual(semver.sanitizeRange("1.1 - 2.1"), [[">=", 100010000, null], ["<", 200020000, null]]);
    assert.deepEqual(semver.sanitizeRange("1 - 2"), [[">=", 100000000, null], ["<", 300000000, null]]);

    assert.deepEqual(semver.sanitizeRange(">1.1"), [[">", 100010000, null]]);
    assert.deepEqual(semver.sanitizeRange(">=1.1"), [[">=", 100010000, null]]);

    assert.deepEqual(semver.sanitizeRange("<1"), [["<", 100000000, null]]);
    assert.deepEqual(semver.sanitizeRange("<1.1"), [["<", 100010000, null]]);
    assert.deepEqual(semver.sanitizeRange("<1.1.1"), [["<", 100010001, null]]);
    assert.deepEqual(semver.sanitizeRange(">=1 <2"), [[">=", 100000000, null], ["<", 200000000, null]]);
    assert.deepEqual(semver.sanitizeRange(">1 <2"), [[">", 100000000, null], ["<", 200000000, null]]);
    assert.deepEqual(semver.sanitizeRange(">1 <=2"), [[">", 100000000, null], ["<", 300000000, null]]);
    assert.deepEqual(semver.sanitizeRange(">1.1 <2.1"), [[">", 100010000, null], ["<", 200010000, null]]);
    assert.deepEqual(semver.sanitizeRange(">1.1 <=2.1"), [[">", 100010000, null], ["<", 200020000, null]]);
    assert.deepEqual(semver.sanitizeRange(">1.1.1 <=2.1.1"), [[">", 100010001, null], ["<=", 200010001, null]]);
};

exports.testSatisfies = function() {
    var tests = [
        ["1.2.3", "1.0.0 - 2.0.0"],
        ["1.0.0", "1.0.0"],
        ["0.2.4", ">=x"],
        ["1.0.0", ""],
        ["1.2.3", "x"],
        ["v1.2.3-foo", "x"],
        ["1.0.0", ">=1.0.0"],
        ["1.0.1", ">=1.0.0"],
        ["1.1.0", ">=1.0.0"],
        ["1.0.1", ">1.0.0"],
        ["1.1.0", ">1.0.0"],
        ["2.0.0", "<=2.0.0"],
        ["1.9999.9999", "<=2.0.0"],
        ["0.2.9", "<=2.0.0"],
        ["1.9999.9999", "<2.0.0"],
        ["0.2.9", "<2.0.0"],
        ["1.0.0", ">= 1.0.0"],
        ["1.0.1", ">=  1.0.0"],
        ["1.1.0", ">=   1.0.0"],
        ["1.0.1", "> 1.0.0"],
        ["1.1.0", ">  1.0.0"],
        ["2.0.0", "<=   2.0.0"],
        ["1.9999.9999", "<= 2.0.0"],
        ["0.2.9", "<=  2.0.0"],
        ["1.9999.9999", "<    2.0.0"],
        ["0.2.9", "<\t2.0.0"],
        ["v0.1.97", ">=0.1.97"],
        ["0.1.97", ">=0.1.97"],
        ["2.1.3", "2.x.x"],
        ["1.2.3", "1.2.x"],
        ["1.2.3", "x"],
        ["2.1.2", "2"],
        ["2.3.1", "2.3"],
        ["1.0.0beta", "<1"],
        ["1.0.0", ">=1"],
        ["1.1.1", "<1.2"],
        ["1.1.0", ">=1.1.0beta2"],
        ["1.1.0", "<1.1.1beta1"]
    ];
    for each (let versions in tests) {
        assert.ok(semver.satisfies(versions[0], versions[1]),
                versions[0] + " must satisfy " + versions[1]);
    }
    return;
};

exports.testCompare = function() {
    var tests = [
        ["0.0.0", "0.0.0foo"],
        ["0.0.1foo", "0.0.0"],
        ["0.0.1foo", "0.0.0foo"],
        ["0.0.1", "0.0.0"],
        ["1.0.0", "0.9.9"],
        ["0.10.0", "0.9.0"],
        ["0.99.0", "0.10.0"],
        ["2.0.0", "1.2.3"],
        ["v0.0.0", "0.0.0foo"],
        ["v0.0.1", "0.0.0"],
        ["v1.0.0", "0.9.9"],
        ["v0.10.0", "0.9.0"],
        ["v0.99.0", "0.10.0"],
        ["v2.0.0", "1.2.3"],
        ["0.0.0", "v0.0.0foo"],
        ["0.0.1", "v0.0.0"],
        ["1.0.0", "v0.9.9"],
        ["0.10.0", "v0.9.0"],
        ["0.99.0", "v0.10.0"],
        ["2.0.0", "v1.2.3"]
    ];

    for each (let versions in tests) {
      assert.ok(semver.isGreater(versions[0], versions[1]),
              "isGreater(" + versions[0] + ", " + versions[1] + ") must return true");
      assert.ok(semver.isLower(versions[1], versions[0]),
              versions[1] + " must be lower than " + versions[0]);
      assert.ok(!semver.isGreater(versions[1], versions[0]),
              versions[1] + " must be not greater than " + versions[0]);
      assert.ok(!semver.isLower(versions[0], versions[1]),
              versions[0] + " must be not lower than " + versions[1]);
    };
    return;
};

exports.testCompareEqual = function() {
    var tests = [
        ["0.0.0", "0.0.0"],
        ["0.0.0", "0.0.0foo"],
        ["0.0.0goo", "0.0.0foo"],
        ["0.0.1", "0.0.0"],
        ["0.0.x", "0.0.0"],
        ["0.x", "0.0.0"],
        ["x", "0.0.0"],
    ];
    
    for each (let versions in tests) {
        assert.ok(semver.isGreaterOrEqual(versions[0], versions[1]),
                versions[0] + " is greater or equal than " + versions[1]);
        assert.ok(semver.isLowerOrEqual(versions[1], versions[0]),
                versions[1] + " is lower or equal than " + versions[0]);
    }
    return;
};

exports.testNegativeSatisfies = function() {
    var tests = [
        ["2.2.3", "1.0.0 - 2.0.0"],
        ["1.0.1", "1.0.0"],
        ["0.0.0", ">=1.0.0"],
        ["0.0.1", ">=1.0.0"],
        ["0.1.0", ">=1.0.0"],
        ["0.0.1", ">1.0.0"],
        ["0.1.0", ">1.0.0"],
        ["3.0.0", "<=2.0.0"],
        ["2.9999.9999", "<=2.0.0"],
        ["2.2.9", "<=2.0.0"],
        ["2.9999.9999", "<2.0.0"],
        ["2.2.9", "<2.0.0"],
        ["v0.1.93", ">=0.1.97"],
        ["0.1.93", ">=0.1.97"],
        ["1.1.3", "2.x.x"],
        ["3.1.3", "2.x.x"],
        ["1.3.3", "1.2.x"],
        ["1.1.2", "2"],
        ["2.4.1", "2.3"],
        ["1.0.0beta", ">=1"],
        ["1.0.0", "<1"],
        ["1.1.1", ">=1.2"]
    ];
    for each (let versions in tests) {
        assert.ok(!semver.satisfies(versions[0], versions[1]),
                versions[0] + " must not satisfy range/version " + versions[1]);
    };
    return;
};

exports.testSort = function() {
    var arr = ["0.1.1", "0.1", "0.1beta2", "1.2", "0.0.1"];
    assert.deepEqual(arr, ["0.0.1", "0.1beta2", "0.1", "0.1.1", "1.2"]);
};
