const DEFAULT_TIMEOUT_MS = 5000;

function validateBaseUrl(baseUrl) {
  const addressPattern =
    /^http:\/\/((?:\d{1,3}\.){3}\d{1,3})(?::(\d{1,5}))?$/;

  if (typeof baseUrl !== "string") {
    throw new Error(
      "Helmet address must be a valid HTTP IPv4 address."
    );
  }

  const match = baseUrl.match(addressPattern);

  if (!match) {
    throw new Error(
      "Helmet address must be a valid HTTP IPv4 address."
    );
  }

  const ipAddress = match[1];
  const port = match[2];

  const octets = ipAddress.split(".").map(Number);

  const validIp = octets.every(
    (octet) =>
      Number.isInteger(octet) &&
      octet >= 0 &&
      octet <= 255
  );

  const validPort =
    port === undefined ||
    (Number(port) >= 1 && Number(port) <= 65535);

  if (!validIp || !validPort) {
    throw new Error(
      "Helmet address contains an invalid IPv4 octet or port."
    );
  }

  return baseUrl;
}

async function requestHelmet(baseUrl, endpoint, options = {}) {
  const url = `${validateBaseUrl(baseUrl)}${endpoint}`;

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Helmet HTTP error: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkHelmetConnection(baseUrl) {
  return requestHelmet(baseUrl, "/status", {
    method: "GET",
  });
}

export async function transmitHelmetCommand(baseUrl, command) {
  if (
    !command ||
    typeof command !== "object" ||
    Array.isArray(command)
  ) {
    throw new TypeError("A structured helmet command is required.");
  }

  return requestHelmet(baseUrl, "/command", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
}
