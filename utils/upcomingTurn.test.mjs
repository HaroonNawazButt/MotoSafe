
import assert from "node:assert/strict";

import {
    buildManeuverPositions,
    getUpcomingTurn,
} from "./upcomingTurn.mjs";

const steps = [
    { distance: 400 },
    { distance: 600 },
    { distance: 500 },
    { distance: 0 },
];

const instructions = [
    { id: 0, type: "depart", instruction: "Begin journey" },
    { id: 1, type: "turn", instruction: "Turn left" },
    { id: 2, type: "turn", instruction: "Turn right" },
    { id: 3, type: "arrive", instruction: "Arrive" },
];

const maneuvers = buildManeuverPositions(
    steps,
    instructions
);

assert.equal(
    maneuvers[1].distanceAlongRouteMeters,
    400
);

const first = getUpcomingTurn(maneuvers, 0, 1500);

assert.equal(first.instruction, "Turn left");
assert.equal(first.distanceToTurnMeters, 400);

const second = getUpcomingTurn(
    maneuvers,
    0.5,
    1500
);

assert.equal(second.instruction, "Turn right");

const destination = getUpcomingTurn(
    maneuvers,
    0.9,
    1500
);

assert.equal(destination.type, "arrive");


const fullRouteManeuvers = [
    {
        id: 0,
        type: "depart",
        distanceAlongRouteMeters: 0,
    },
    {
        id: 1,
        type: "turn",
        instruction: "Turn right",
        distanceAlongRouteMeters: 800,
    },
    {
        id: 2,
        type: "arrive",
        instruction: "Arrive",
        distanceAlongRouteMeters: 1800,
    },
];

// The route is 2000 m long, but the last maneuver
// is at 1800 m. At 50% progress, the right turn
// at 800 m must already be behind us.
const correctedTurn = getUpcomingTurn(
    fullRouteManeuvers,
    0.5,
    2000
);

assert.equal(correctedTurn.type, "arrive");
assert.equal(correctedTurn.distanceToTurnMeters, 800);

// Invalid route distance must not produce guidance.
assert.equal(
    getUpcomingTurn(fullRouteManeuvers, 0.5, 0),
    null
);

console.log("Upcoming turn tests: 7/7 passed");
