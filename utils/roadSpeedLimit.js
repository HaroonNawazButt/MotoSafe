// utils/roadSpeedLimit.js
// MotoSafe — road speed-limit utilities

/**
 * Convert an OpenStreetMap-style maxspeed value to km/h.
 *
 * Examples:
 *   "60"       -> 60
 *   "60 km/h"  -> 60
 *   "30 mph"   -> ~48.3
 *
 * Values such as "signals", "none", "variable", or missing values
 * are treated as unknown.
 */
export const parseMaxSpeed = (maxspeed) => {
    if (maxspeed === null || maxspeed === undefined) {
        return null;
    }

    const value = String(maxspeed).trim().toLowerCase();

    if (!value) {
        return null;
    }

    // Do not invent a numeric limit for non-numeric OSM values.
    if (
        value === "none" ||
        value === "signals" ||
        value === "variable" ||
        value === "walk"
    ) {
        return null;
    }

    // MPH value, e.g. "30 mph"
    const mphMatch = value.match(/^(\d+(?:\.\d+)?)\s*mph$/);

    if (mphMatch) {
        const mph = Number(mphMatch[1]);

        if (!Number.isFinite(mph) || mph <= 0) {
            return null;
        }

        return mph * 1.609344;
    }

    // km/h or plain numeric OSM value
    const kmhMatch = value.match(
        /^(\d+(?:\.\d+)?)\s*(?:km\/h|kmh|kph)?$/,
    );

    if (kmhMatch) {
        const kmh = Number(kmhMatch[1]);

        if (!Number.isFinite(kmh) || kmh <= 0) {
            return null;
        }

        return kmh;
    }

    return null;
};
export const getRoadSpeedLimit = async (latitude, longitude) => {
    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        throw new Error("Invalid GPS coordinates.");
    }

    const query = `
        [out:json][timeout:10];
        way(around:25,${latitude},${longitude})
          ["highway"];
        out tags center;
    `;

    const url = "https://overpass-api.de/api/interpreter";

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                "User-Agent": "MotoSafe-FYP/1.0",
            },
            body: "data=" + encodeURIComponent(query),
        });

        if (!response.ok) {
            throw new Error(
                `Road lookup failed with status ${response.status}`,
            );
        }

        const data = await response.json();

        console.log(
            "[MotoSafe Road] Candidate roads:",
            data.elements.map((element) => ({
                id: element.id,
                name: element.tags?.name ?? null,
                highway: element.tags?.highway ?? null,
                maxspeed: element.tags?.maxspeed ?? null,
            })),
        );

        if (!Array.isArray(data.elements) || data.elements.length === 0) {
            return {
                roadName: null,
                roadType: null,
                mapSpeedLimit: null,
                source: "unknown",
            };
        }

        /*
         * Prototype selection:
         * Prefer a nearby road that actually contains maxspeed.
         *
         * Later we will improve this to proper road matching rather than
         * blindly trusting the first nearby OSM way.
         */
        const roadWithSpeed = data.elements.find(
            (element) => element.tags?.maxspeed,
        );

        const road = roadWithSpeed ?? data.elements[0];
        const tags = road.tags ?? {};

        const mapSpeedLimit = parseMaxSpeed(tags.maxspeed);

        return {
            roadName: tags.name ?? tags.ref ?? "Unnamed road",
            roadType: tags.highway ?? null,
            mapSpeedLimit,
            rawMaxSpeed: tags.maxspeed ?? null,
            osmWayId: road.id ?? null,
            source: mapSpeedLimit !== null ? "map" : "unknown",
        };
    } catch (error) {
        console.error("[MotoSafe Road] Lookup error:", error);

        return {
            roadName: null,
            roadType: null,
            mapSpeedLimit: null,
            source: "unknown",
        };
    }
};