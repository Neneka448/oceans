import { env } from "../../../config/env.js";
import type { ExampleInfo } from "../domain/example-info.js";

export class ExampleService {
  getInfo(): ExampleInfo {
    return {
      service: env.SERVICE_NAME,
      env: env.NODE_ENV,
      version: "0.1.0"
    };
  }

  echo(message: string): { echo: string } {
    return { echo: message };
  }
}
