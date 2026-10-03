const http = require("node:http");

const PORT = 8765;

const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.method === "GET" && req.url === "/status") {
        res.writeHead(200);
        res.end(
            JSON.stringify({
                status: "ok",
                device: "MOCK_ESP32_CAM",
                protocolVersion: 1,
            })
        );
        return;
    }

    if (req.method === "POST" && req.url === "/command") {
        let body = "";

        req.on("data", (chunk) => {
            body += chunk;
        });

        req.on("end", () => {
            try {
                const command = JSON.parse(body);

                console.log("[MOCK ESP32] Received:", command);

                res.writeHead(200);
                res.end(
                    JSON.stringify({
                        success: true,
                        accepted: true,
                        simulated: true,
                        delivered: false,
                        commandType: command.type,
                    })
                );
            } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });

        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Endpoint not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(
        `[MOCK ESP32] Running at http://127.0.0.1:${PORT}`
    );
});