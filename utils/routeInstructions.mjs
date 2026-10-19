
function getInstruction(step) {
    const maneuver = step?.maneuver;

    if (!maneuver) return null;

    const type = maneuver.type;
    const modifier = maneuver.modifier;
    const road = step.name?.trim();
    const roadText = road ? ` onto ${road}` : "";

    if (type === "depart") {
        return "Begin your journey";
    }

    if (type === "arrive") {
        return "You have arrived at your destination";
    }

    if (type === "roundabout" || type === "rotary") {
        const exit = maneuver.exit;
        return Number.isInteger(exit)
            ? `Enter the roundabout and take exit ${exit}`
            : "Enter the roundabout";
    }

    if (type === "turn" || type === "end of road") {
        if (modifier === "left" || modifier === "slight left") {
            return `Turn left${roadText}`;
        }

        if (modifier === "right" || modifier === "slight right") {
            return `Turn right${roadText}`;
        }

        if (modifier === "sharp left") {
            return `Make a sharp left${roadText}`;
        }

        if (modifier === "sharp right") {
            return `Make a sharp right${roadText}`;
        }

        if (modifier === "straight") {
            return `Continue straight${roadText}`;
        }

        if (modifier === "uturn") {
            return "Make a U-turn where permitted";
        }
    }

    if (type === "continue" || type === "new name") {
        return road
            ? `Continue onto ${road}`
            : "Continue straight";
    }

    if (type === "merge") {
        return `Merge${roadText}`;
    }

    if (type === "on ramp") {
        return `Take the ramp${roadText}`;
    }

    if (type === "off ramp") {
        return `Take the exit${roadText}`;
    }

    if (type === "fork") {
        return modifier
            ? `Keep ${modifier}${roadText}`
            : "Keep to the indicated road";
    }

    return road
        ? `Continue onto ${road}`
        : "Continue along the route";
}

export function extractRouteInstructions(steps) {
    if (!Array.isArray(steps)) return [];

    return steps
        .map((step, index) => {
            const maneuver = step?.maneuver;
            const location = maneuver?.location;

            if (
                !Array.isArray(location) ||
                location.length < 2 ||
                !Number.isFinite(location[0]) ||
                !Number.isFinite(location[1])
            ) {
                return null;
            }

            return {
                id: index,
                type: maneuver.type,
                instruction: getInstruction(step),
                coordinate: {
                    latitude: location[1],
                    longitude: location[0],
                },
                stepDistanceMeters: step.distance ?? 0,
            };
        })
        .filter((step) => step && step.instruction);
}
