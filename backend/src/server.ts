import dotenv from "dotenv";
import https from "https";
import fs from "fs";
import path from "path";
import app from "./app.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

const isHttpsDev = process.env.LOCAL_HTTPS === "true";

if (isHttpsDev) {
  const certPath = path.resolve(
    process.cwd(),
    "../frontend/certificates/lan-cert.pem"
  );

  const keyPath = path.resolve(
    process.cwd(),
    "../frontend/certificates/lan-key.pem"
  );

  const httpsServer = https.createServer(
    {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    },
    app
  );

  httpsServer.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[server]: Backend HTTPS server is running at https://192.168.0.2:${PORT}`
    );
    console.log(
      `[server]: Health check available at https://192.168.0.2:${PORT}/api/health`
    );
  });
} else {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[server]: Backend server is running at http://localhost:${PORT}`
    );
    console.log(
      `[server]: Health check available at http://localhost:${PORT}/api/health`
    );
  });
}