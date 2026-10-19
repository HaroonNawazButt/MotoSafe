
import assert from "node:assert/strict";
import { calculateRouteProgress } from "./routeProgress.mjs";

const route = [
    { latitude: 31.5000, longitude: 74.3000 },
    { latitude: 31.5100, longitude: 74.3000 },
    { latitude: 31.5200, longitude: 74.3000 },
];

const totalDistance = 2224;

const start = calculateRouteProgress(
    route[0],
    route,
    totalDistance
);

const middle = calculateRouteProgress(
    route[1],
    route,
    totalDistance
);

const end = calculateRouteProgress(
    route[2],
    route,
    totalDistance
);

assert.ok(start.remainingMeters > 2200);

assert.ok(
    middle.remainingMeters > 1000 &&
    middle.remainingMeters < 1250
);

assert.ok(end.remainingMeters < 1);

assert.ok(
    start.remainingMeters >
    middle.remainingMeters &&
    middle.remainingMeters >
    end.remainingMeters
);

console.log("Route progress tests: 4/4 passed");
console.log({
    start: Math.round(start.remainingMeters),
    middle: Math.round(middle.remainingMeters),
    end: Math.round(end.remainingMeters),
});
