const system = require("system");
const assert = require("assert");
const semver = require("../lib/semver");

exports.testParseVersion = () => {
    assert.deepEqual(semver.parseVersion("1"), [1, null, null, null]);
    assert.deepEqual(semver.parseVersion("1.0"), [1, 0, null, null]);
    assert.deepEqual(semver.parseVersion("1.x"), [1, "x", null, null]);
    assert.deepEqual(semver.parseVersion("1.0.x"), [1, 0, "x", null]);
    assert.deepEqual(semver.parseVersion("1beta3"), [1, null, null, "beta3"]);
    assert.deepEqual(semver.parseVersion("1.1beta3"), [1, 1, null, "beta3"]);
    assert.deepEqual(semver.parseVersion("1.0.1beta3"), [1, 0, 1, "beta3"]);
};

exports.testParseRange = () => {
    assert.deepEqual(semver.parseRange("1"), [null, "1", null, null]);
    assert.deepEqual(semver.parseRange("> 1"), [">", "1", null, null]);
    assert.deepEqual(semver.parseRange(">= 1"), [">=", "1", null, null]);
    assert.deepEqual(semver.parseRange(">= 1.0.1beta"), [">=", "1.0.1beta", null, null]);
    assert.deepEqual(semver.parseRange(">= 1 <= 2"), [">=", "1", "<=", "2"]);
    assert.deepEqual(semver.parseRange("1 - 2"), [null, "1", null, "2"]);
};

exports.testSanitizeRange = () => {
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

exports.testSatisfies = () => {
    const tests = [
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
        ["1.1.0", "<1.1.1beta1"],
        ["0.2.0beta2", ">= 0.2.0beta2"],
        ["0.2.0beta2", "> 0.2.0beta1"],
        ["0.2.0beta2", "> 0.2.0alpha2"],
        ["0.2.0beta2", "> 0.2.0beta"]
    ];
    tests.forEach(test => {
        const [versionA, versionB] = test;
        assert.ok(semver.satisfies(versionA, versionB),
                versionA + " must satisfy " + versionB);
    });
};

exports.testCompare = () => {
    const tests = [
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

    tests.forEach(test => {
        const [versionA, versionB] = test;
        assert.ok(semver.isGreater(versionA, versionB),
                "isGreater(" + versionA + ", " + versionB + ") must return true");
        assert.ok(semver.isLower(versionB, versionA),
                versionB + " must be lower than " + versionA);
        assert.ok(!semver.isGreater(versionB, versionA),
                versionB + " must be not greater than " + versionA);
        assert.ok(!semver.isLower(versionA, versionB),
                versionA + " must be not lower than " + versionB);
    });
};

exports.testCompareEqual = () => {
    const tests = [
        ["0.0.0", "0.0.0"],
        ["0.0.0", "0.0.0foo"],
        ["0.0.0goo", "0.0.0foo"],
        ["0.0.1", "0.0.0"],
        ["0.0.x", "0.0.0"],
        ["0.x", "0.0.0"],
        ["x", "0.0.0"]
    ];

    tests.forEach(test => {
        const [versionA, versionB] = test;
        assert.ok(semver.isGreaterOrEqual(versionA, versionB),
                versionA + " is greater or equal than " + versionB);
        assert.ok(semver.isLowerOrEqual(versionB, versionA),
                versionB + " is lower or equal than " + versionB);
    });
};

exports.testIsEqual = () => {
    const tests = [
        ["0.0.1", "0.0.1"],
        ["0.1.0", "0.1"],
        ["0.1.0alpha1", "0.1alpha1"],
        ["1beta2", "1.0.0beta2"]
    ];
    tests.forEach(test => {
        const [versionA, versionB] = test;
        assert.ok(semver.isEqual(versionA, versionB),
                versionA + " is equal to " + versionB);
    });
};

exports.testNegativeSatisfies = () => {
    const tests = [
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
    tests.forEach(test => {
        const [versionA, versionB] = test;
        assert.ok(!semver.satisfies(versionA, versionB),
                versionA + " must not satisfy range/version " + versionB);
    });
};

exports.testSort = () => {
    const arr = ["0.1.1", "0.1", "0.1beta2", "1.2", "0.0.1"];
    // ascending
    assert.deepEqual(semver.sort(arr, 1), ["0.0.1", "0.1beta2", "0.1", "0.1.1", "1.2"]);
    // descending
    assert.deepEqual(semver.sort(arr, -1), ["1.2", "0.1.1", "0.1", "0.1beta2", "0.0.1"]);
};

exports.testIsCompatible = () => {
    const tests = [
        ["0.1", "0.9"],
        ["0.0.1", "0.1.9alpha1"],
        ["1.0", "1.5"]
    ];
    tests.forEach(test => {
        const [versionA, versionB] = test;
        assert.ok(semver.isCompatible(versionA, versionB),
                versionA + " is compatible to " + versionB);
    });
    assert.isFalse(semver.isCompatible("1.0.5", "2.0"));
};


if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}