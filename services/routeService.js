
const OSRM_BASE_URL = "https://router.project-osrm.org";

export async function calculateRoute(origin, destination) {
    const valid = (point) =>
        point &&
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        Math.abs(point.latitude) <= 90 &&
        Math.abs(point.longitude) <= 180;

    if (!valid(origin) || !valid(destination)) {
        throw new Error("Valid GPS coordinates are required.");
    }

    const coordinates = [
        `${origin.longitude},${origin.latitude}`,
        `${destination.longitude},${destination.latitude}`,
    ].join(";");

    const url =
        `${OSRM_BASE_URL}/route/v1/driving/${coordinates}` +
        "?overview=full&geometries=geojson&steps=true";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Routing service error: ${response.status}`);
        }

        const result = await response.json();

        if (result.code !== "Ok" || !result.routes?.length) {
            throw new Error("No drivable route was found.");
        }

        const route = result.routes[0];

        return {
            distanceMeters: route.distance,
            durationSeconds: route.duration,
            coordinates: route.geometry.coordinates.map(
                ([longitude, latitude]) => ({
                    latitude,
                    longitude,
                })
            ),
            steps: route.legs.flatMap((leg) => leg.steps || []),
        };
    } catch (error) {
        const message = String(error?.message || "");

        const wasCancelled =
            error?.name === "AbortError" ||
            /cancelled|canceled|aborted/i.test(message);

        if (controller.signal.aborted) {
            throw new Error(
                "Route calculation timed out. Please try again."
            );
        }

        if (wasCancelled) {
            throw new Error(
                "Route request was interrupted. Please try again."
            );
        }

        if (
            error instanceof TypeError ||
            /network request failed|fetch failed/i.test(message)
        ) {
            throw new Error(
                "Network connection failed. Check your internet and try again."
            );
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
