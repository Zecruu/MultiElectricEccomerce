import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        test: "test";
        production: "production";
    }>>;
    PORT: z.ZodDefault<z.ZodString>;
    MONGO_URI: z.ZodString;
    JWT_ACCESS_SECRET: z.ZodString;
    JWT_REFRESH_SECRET: z.ZodString;
    COOKIE_DOMAIN: z.ZodOptional<z.ZodString>;
    COOKIE_SAMESITE: z.ZodOptional<z.ZodEnum<{
        lax: "lax";
        none: "none";
        strict: "strict";
    }>>;
    FRONTEND_ORIGIN: z.ZodString;
    CORS_ADDITIONAL_ORIGINS: z.ZodOptional<z.ZodString>;
    CORS_ALLOW_VERCEL_WILDCARD: z.ZodOptional<z.ZodString>;
    APP_BASE_URL: z.ZodOptional<z.ZodString>;
    BACKEND_BASE_URL: z.ZodOptional<z.ZodString>;
    EMAIL_HOST: z.ZodOptional<z.ZodString>;
    EMAIL_PORT: z.ZodOptional<z.ZodString>;
    EMAIL_USER: z.ZodOptional<z.ZodString>;
    EMAIL_PASS: z.ZodOptional<z.ZodString>;
    GOOGLE_CLIENT_ID: z.ZodOptional<z.ZodString>;
    GOOGLE_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    AWS_REGION: z.ZodOptional<z.ZodString>;
    S3_BUCKET: z.ZodOptional<z.ZodString>;
    STRIPE_SECRET_KEY: z.ZodOptional<z.ZodString>;
    STRIPE_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Env = z.infer<typeof envSchema>;
export declare const env: Env;
export {};
//# sourceMappingURL=env.d.ts.map