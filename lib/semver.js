const REGEX_VERSION = /^v?([\dx]+)(?:\.([\dx]+))?(?:\.([\dx]+))?(.*)$/i;
const REGEX_RANGE = /^\s*([<>=]*)\s*([\d.a-z]+)[\s-]*(?:([<>=]+)?\s*([\d.a-z]+)\s*)?$/i;
const OPERATORS = {
    ">": "isGreater",
    ">=": "isGreaterOrEqual",
    "<": "isLower",
    "<=": "isLowerOrEqual"
};
const COMPARATORS = {
    "isEqual": (valueA, tagA, valueB, tagB) => {
        return valueA === valueB && tagA === tagB;
    },
    "isGreater": (valueA, tagA, valueB, tagB) => {
        if (valueA === valueB) {
            return COMPARATORS.tagIsGreater(tagA || "", tagB || "");
        }
        return valueA > valueB;
    },
    "isGreaterOrEqual": (valueA, tagA, valueB, tagB) => {
        if (valueA === valueB) {
            return COMPARATORS.tagIsGreaterOrEqual(tagA || "", tagB || "");
        }
        return valueA >= valueB;
    },
    "isLower": (valueA, tagA, valueB, tagB) => {
        return COMPARATORS.isGreater(valueB, tagB, valueA, tagA);
    },
    "isLowerOrEqual": (valueA, tagA, valueB, tagB) => {
        return COMPARATORS.isGreaterOrEqual(valueB, tagB, valueA, tagA);
    },
    "tagIsGreater": (tagLeft, tagRight) => {
        return !!tagRight && (!tagLeft || tagLeft > tagRight);
    },
    "tagIsGreaterOrEqual": (tagLeft, tagRight) => {
        return (!tagLeft && !tagRight) ||
                (tagLeft === tagRight) ||
                COMPARATORS.tagIsGreater(tagLeft, tagRight);
    }
};

const compare = (versionA, versionB, comparatorName) => {
    const [valueA, tagA] = sanitizeVersion(versionA);
    const [valueB, tagB] = sanitizeVersion(versionB);
    return COMPARATORS[comparatorName](valueA, tagA, valueB, tagB);
};

exports.isEqual = (versionA, versionB) => {
    return compare(versionA, versionB, "isEqual");
};

exports.isGreater = (versionA, versionB) => {
    return compare(versionA, versionB, "isGreater");
};

exports.isGreaterOrEqual = (versionA, versionB) => {
    return compare(versionA, versionB, "isGreaterOrEqual");
};

exports.isLower = (versionA, versionB) => {
    return compare(versionA, versionB, "isLower");
};

exports.isLowerOrEqual = (versionA, versionB) => {
    return compare(versionA, versionB, "isLowerOrEqual");
};

exports.satisfies = (version, range) => {
    if (typeof(range) !== "string" || range.length < 1) {
        // no range given, so version satisfies constraint
        return true;
    }
    const [versionValue, versionTag] = sanitizeVersion(version);
    return sanitizeRange(range).every(part => {
        return toComparator.apply(null, part)(versionValue, versionTag);
    });
};

const toNumber = (nr) => {
    if (typeof(nr) === "string" && nr.length > 0) {
        if (nr === "x" || nr === "X") {
            return nr;
        }
        if (!isNaN(nr)) {
            return parseInt(nr, 10);
        }
        return nr;
    }
    return null;
};

const parseVersion = exports.parseVersion = (version) => {
    const match = version.match(REGEX_VERSION);
    if (match === null) {
        throw new Error("Unable to parse version '" + version + "'");
    }
    return [match[1], match[2], match[3], match[4]].map(toNumber);
};

const parseRange = exports.parseRange = (range) => {
    const match = range.match(REGEX_RANGE);
    if (match === null) {
        throw new Error("Unable to parse range '" + range + "'");
    }
    return [match[1] || null, match[2], match[3] || null, match[4]];
};

const sanitizeRange = exports.sanitizeRange = (range) => {
    const [loper, lver, roper, rver] = parseRange(range);
    const left = sanitizeRangeVersion(loper || ">=", lver);
    // return just left part if it has specified an operator and
    // the right range part is missing
    if (loper && lver && !rver) {
        return [left];
    }
    const right = sanitizeRangeVersion(roper || "<=", rver || lver);
    return [left, right];
};

const toComparator = (operator, rangeValue, rangeTag) => {
    return (value, tag) => {
        const comparatorName = OPERATORS[operator];
        return COMPARATORS[comparatorName](value, tag, rangeValue, rangeTag);
    };
};

const isExact = (M, m, p) => {
    return (M != null && M !== "x")
        && (m != null && m !== "x")
        && (p != null && p !== "x");
};

const sanitizeRangeVersion = (operator, version) => {
    const [M, m, p, tag] = parseVersion(version);
    let wildcardValue = 0;
    if (operator === "<=" && !isExact(M, m, p)) {
        operator = "<";
        wildcardValue = 10000;
    }
    const value = getVersionValue(M, m, p, wildcardValue);
    return [operator, value, tag];
};

const getVersionValue = (M, m, p, wildcardValue) => {
    let foundWildcard = false;
    return [M, m, p].reduce((prev, curr, idx, arr) => {
        if (curr === undefined || curr === null || curr === "x") {
            if (!foundWildcard) {
                curr = wildcardValue;
                foundWildcard = true;
            } else {
                curr = 0;
            }
        }
        return prev + (curr * Math.pow(10000, arr.length - idx - 1));
    }, 0);
};

const sanitizeVersion = exports.sanitizeVersion = (version) => {
    const [M, m, p, tag] = parseVersion(version);
    const value = getVersionValue(M, m, p, 0);
    return [value, tag];
};

const cleanVersion = exports.cleanVersion = (version) => {
    const [M, m, p, tag] = parseVersion(version);
    return [M || 0, ".", m || 0, ".", p || 0, tag || ""].join("");
};

const getSorter = exports.getSorter = (order) => {
    return (a, b) => {
        const [valueA, tagA] = sanitizeVersion(a);
        const [valueB, tagB] = sanitizeVersion(b);
        if (COMPARATORS.isLower(valueA, tagA, valueB, tagB)) {
            return order * -1;
        } else if (COMPARATORS.isGreater(valueA, tagA, valueB, tagB)) {
            return order;
        }
        return 0;
    }
};

const sort = exports.sort = (arr, order) => {
    return arr.sort(getSorter(order || 1));
};

/**
 * Returns true if version A is compatible to version B (which, by semver spec,
 * means that the major version number is equal)
 * @param {String} versionA The version to compare
 * @param {String} versionB The version to compare to
 * @returns True if both versions are expected to be compatible, false otherwise
 * @type Boolean
 */
const isCompatible = exports.isCompatible = (versionA, versionB) => {
    const [majorA] = parseVersion(versionA);
    const [majorB] = parseVersion(versionB);
    return majorA === majorB;
};