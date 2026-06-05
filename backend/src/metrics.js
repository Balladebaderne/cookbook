import client from "prom-client";

// One shared registry for the whole backend so every layer (HTTP handler, data
// layer) reports into the same `/metrics` output. Defining the metrics here —
// rather than inline in index.js — lets the db layer record query timings
// without index.js and db/index.js importing each other.
export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "status"],
  registers: [register],
});
