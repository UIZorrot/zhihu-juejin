import { createApp } from "./app";

const app = createApp();
const port = Number.parseInt(process.env.API_PORT ?? "4100", 10);
const host = process.env.API_HOST ?? "127.0.0.1";

await app.listen({ host, port });
