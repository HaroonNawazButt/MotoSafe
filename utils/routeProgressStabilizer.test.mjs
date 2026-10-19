
import assert from "node:assert/strict";

import {
    stabilizeRouteProgress,
} from "./routeProgressStabilizer.mjs";

const previous = {
    remainingMeters: 2000,
    distanceFromRouteMeters: 5,
    timestamp: 10000,
};

const normal = stabilizeRouteProgress(previous, {
    remainingMeters: 1960,
    distanceFromRouteMeters: 4,
    timestamp: 12000,
});

assert.equal(normal.status, "accepted");
assert.equal(normal.progress.remainingMeters, 1960);

const jitter = stabilizeRouteProgress(previous, {
    remainingMeters: 2010,
    distanceFromRouteMeters: 7,
    timestamp: 12000,
});

assert.equal(jitter.status, "held");
assert.equal(jitter.progress.remainingMeters, 2000);

const backward = stabilizeRouteProgress(previous, {
    remainingMeters: 2150,
    distanceFromRouteMeters: 6,
    timestamp: 12000,
});

assert.equal(backward.status, "needs-recheck");

const jump = stabilizeRouteProgress(previous, {
    remainingMeters: 1500,
    distanceFromRouteMeters: 3,
    timestamp: 12000,
});

assert.equal(jump.status, "needs-recheck");

const stale = stabilizeRouteProgress(previous, {
    remainingMeters: 1950,
    distanceFromRouteMeters: 3,
    timestamp: 9000,
});

assert.equal(stale.status, "stale");

console.log("Route stabilization tests: 5/5 passed");
