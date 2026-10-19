
import assert from "node:assert/strict";

import {
    extractRouteInstructions,
} from "./routeInstructions.mjs";

const sampleSteps = [
    {
        distance: 150,
        name: "Main Road",
        maneuver: {
            type: "depart",
            location: [74.3000, 31.5000],
        },
    },
    {
        distance: 400,
        name: "Mall Road",
        maneuver: {
            type: "turn",
            modifier: "right",
            location: [74.3100, 31.5100],
        },
    },
    {
        distance: 100,
        name: "",
        maneuver: {
            type: "arrive",
            location: [74.3200, 31.5200],
        },
    },
];

const instructions = extractRouteInstructions(sampleSteps);

assert.equal(instructions.length, 3);

assert.equal(
    instructions[0].instruction,
    "Begin your journey"
);

assert.equal(
    instructions[1].instruction,
    "Turn right onto Mall Road"
);

assert.equal(
    instructions[2].instruction,
    "You have arrived at your destination"
);

assert.equal(
    instructions[1].coordinate.latitude,
    31.5100
);

console.log("Route instruction tests: 5/5 passed");
