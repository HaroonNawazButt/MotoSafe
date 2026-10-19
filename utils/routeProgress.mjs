
const EARTH_RADIUS = 6371000;

function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

function distanceMeters(a, b) {
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);

    const dLat = lat2 - lat1;
    const dLon = toRadians(b.longitude - a.longitude);

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;

    return (
        2 *
        EARTH_RADIUS *
        Math.asin(Math.min(1, Math.sqrt(h)))
    );
}

export function calculateRouteProgress(
    position,
    coordinates,
    routeDistanceMeters
) {
    if (
        !position ||
        !Array.isArray(coordinates) ||
        coordinates.length < 2 ||
        !Number.isFinite(routeDistanceMeters) ||
        routeDistanceMeters < 0
    ) {
        return null;
    }

    // Convert nearby geographic positions into local metre coordinates.
    const latitudeRad = toRadians(position.latitude);

    const project = (point) => ({
        x:
            toRadians(point.longitude - position.longitude) *
            EARTH_RADIUS *
            Math.cos(latitudeRad),
        y:
            toRadians(point.latitude - position.latitude) *
            EARTH_RADIUS,
    });

    const segmentLengths = [];
    let totalGeometryLength = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
        const length = distanceMeters(
            coordinates[i],
            coordinates[i + 1]
        );

        segmentLengths.push(length);
        totalGeometryLength += length;
    }

    if (totalGeometryLength <= 0) return null;

    let closestDistance = Infinity;
    let closestProgress = 0;
    let distanceBeforeSegment = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
        const a = project(coordinates[i]);
        const b = project(coordinates[i + 1]);

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy;

        const t =
            lengthSquared > 0
                ? Math.max(
                    0,
                    Math.min(
                        1,
                        -(a.x * dx + a.y * dy) / lengthSquared
                    )
                )
                : 0;

        const nearestX = a.x + t * dx;
        const nearestY = a.y + t * dy;

        const distance = Math.hypot(nearestX, nearestY);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestProgress =
                distanceBeforeSegment + t * segmentLengths[i];
        }

        distanceBeforeSegment += segmentLengths[i];
    }

    const progressFraction = Math.max(
        0,
        Math.min(1, closestProgress / totalGeometryLength)
    );

    return {
        progressFraction,
        remainingMeters:
            routeDistanceMeters * (1 - progressFraction),
        distanceFromRouteMeters: closestDistance,
    };
}
