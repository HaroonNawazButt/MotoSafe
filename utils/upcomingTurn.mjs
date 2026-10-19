
export function buildManeuverPositions(steps, instructions) {
    if (!Array.isArray(steps) || !Array.isArray(instructions)) {
        return [];
    }

    let distanceAlongRoute = 0;

    const stepPositions = steps.map((step) => {
        const position = distanceAlongRoute;

        const distance = Number.isFinite(step?.distance)
            ? Math.max(0, step.distance)
            : 0;

        distanceAlongRoute += distance;

        return position;
    });

    return instructions
        .filter(
            (instruction) =>
                Number.isInteger(instruction.id) &&
                instruction.id >= 0 &&
                instruction.id < steps.length
        )
        .map((instruction) => ({
            ...instruction,
            distanceAlongRouteMeters:
                stepPositions[instruction.id],
        }));
}


export function getUpcomingTurn(
    maneuvers,
    progressFraction,
    totalRouteDistanceMeters
) {
    if (
        !Array.isArray(maneuvers) ||
        !Number.isFinite(progressFraction) ||
        !Number.isFinite(totalRouteDistanceMeters) ||
        totalRouteDistanceMeters <= 0
    ) {
        return null;
    }

    const traveledDistance =
        Math.max(0, Math.min(1, progressFraction)) *
        totalRouteDistanceMeters;

    const upcoming = maneuvers.find(
        (maneuver) =>
            maneuver.type !== "depart" &&
            Number.isFinite(maneuver.distanceAlongRouteMeters) &&
            maneuver.distanceAlongRouteMeters >
            traveledDistance + 5
    );

    if (!upcoming) {
        return null;
    }

    return {
        ...upcoming,
        distanceToTurnMeters: Math.max(
            0,
            upcoming.distanceAlongRouteMeters - traveledDistance
        ),
    };
}
