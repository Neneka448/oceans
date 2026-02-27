import { buildApp } from "./server.js";
import { env } from "./config/env.js";

const app = buildApp();

const start = async (): Promise<void> => {
  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST
    });
  } catch (error) {
    app.log.error({ err: error }, "failed to start server");
    process.exit(1);
  }
};

void start();
