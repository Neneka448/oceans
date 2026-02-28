import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  SERVICE_NAME: z.string().default("oceans-backend"),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default("root"),
  DB_NAME: z.string().default("oceans"),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  DB_QUEUE_LIMIT: z.coerce.number().int().min(0).default(0)
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);
