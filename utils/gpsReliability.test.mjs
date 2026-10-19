
import assert from "node:assert/strict";

import {
    evaluateGpsReliability,
} from "./gpsReliability.mjs";

const now = 100000;

const validLocation = {
    timestamp: 98000,
    coords: {
        latitude: 31.52,
        longitude: 74.35,
        accuracy: 6,
    },
};

// Test 1: Fresh, accurate GPS.
const reliable = evaluateGpsReliability(
    validLocation,
    { now }
);
assert.equal(reliable.status, "reliable");
assert.equal(reliable.reliable, true);

// Test 2: Outdated GPS.
const stale = evaluateGpsReliability(
    { ...validLocation, timestamp: 80000 },
    { now }
);
assert.equal(stale.status, "stale");

// Test 3: Poor reported accuracy.
const inaccurate = evaluateGpsReliability(
    {
        ...validLocation,
        coords: {
            ...validLocation.coords,
            accuracy: 80,
        },
    },
    { now }
);
assert.equal(inaccurate.status, "poor-accuracy");

// Test 4: Missing location.
const missing = evaluateGpsReliability(null, { now });
assert.equal(missing.status, "unavailable");

// Test 5: Invalid latitude.
const invalid = evaluateGpsReliability(
    {
        ...validLocation,
        coords: {
            ...validLocation.coords,
            latitude: 120,
        },
    },
    { now }
);
assert.equal(invalid.status, "invalid");

// Test 6: A future timestamp beyond tolerance.
const future = evaluateGpsReliability(
    { ...validLocation, timestamp: 105000 },
    { now }
);
assert.equal(future.status, "invalid-time");

// Test 7: Exactly 10 seconds old is still allowed.
const boundary = evaluateGpsReliability(
    { ...validLocation, timestamp: 90000 },
    { now }
);
assert.equal(boundary.status, "reliable");

console.log("GPS reliability tests: 7/7 passed");
