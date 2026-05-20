import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const deployScript = path.join(repoRoot, "deploy", "blue-green", "deploy-blue-green.sh");
const rollbackScript = path.join(repoRoot, "deploy", "blue-green", "rollback-blue-green.sh");

let tmp;

beforeEach(() => {
  tmp = mkdtempSync(path.join(tmpdir(), "cookbook-blue-green-"));
  writeFileSync(path.join(tmp, "backend-compose.yml"), "services: {}\n");
  writeFileSync(path.join(tmp, "nginx-compose.yml"), "services: {}\n");
  writeFileSync(path.join(tmp, "docker.log"), "");
  writeFileSync(path.join(tmp, "curl.log"), "");

  writeFileSync(path.join(tmp, "active-color.env"), [
    "ACTIVE_COLOR=blue",
    "PREVIOUS_COLOR=green",
    "BACKEND_PRIVATE_IP=10.0.0.4",
    "BACKEND_HOST=10.0.0.4:3001",
    "BLUE_BACKEND_HOST=10.0.0.4:3001",
    "GREEN_BACKEND_HOST=10.0.0.4:3002",
    "BACKEND_IMAGE_TAG=old-backend",
    "FRONTEND_IMAGE_TAG=old-frontend",
    "UPDATED_AT=2026-01-01T00:00:00Z",
    "",
  ].join("\n"));

  writeFileSync(path.join(tmp, "docker"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$DOCKER_LOG"
if [[ "$1" == "inspect" ]]; then
  printf '%s\\n' "\${DOCKER_INSPECT_STATUS:-healthy}"
fi
exit 0
`);
  writeFileSync(path.join(tmp, "curl"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CURL_LOG"
exit "\${CURL_EXIT:-0}"
  `);
  chmodSync(path.join(tmp, "docker"), 0o755);
  chmodSync(path.join(tmp, "curl"), 0o755);
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function runScript(script, env = {}) {
  return spawnSync("bash", [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${tmp}${path.delimiter}${process.env.PATH}`,
      GITHUB_OWNER: "BalladeBaderne",
      ACTIVE_ENV_FILE: path.join(tmp, "active-color.env"),
      BACKEND_COMPOSE_FILE: path.join(tmp, "backend-compose.yml"),
      NGINX_COMPOSE_FILE: path.join(tmp, "nginx-compose.yml"),
      DOCKER_LOG: path.join(tmp, "docker.log"),
      CURL_LOG: path.join(tmp, "curl.log"),
      ...env,
    },
  });
}

function readEnvFile() {
  return Object.fromEntries(
    readFileSync(path.join(tmp, "active-color.env"), "utf8")
      .trim()
      .split("\n")
      .map((line) => line.split("=", 2))
  );
}

function readLog(name) {
  return readFileSync(path.join(tmp, name), "utf8").trim().split("\n").filter(Boolean);
}

describe("deploy/blue-green/deploy-blue-green.sh", () => {
  it("deploys the inactive color and rewrites active-color.env only after health passes", () => {
    const result = runScript(deployScript, {
      BACKEND_IMAGE_TAG: "sha-test",
      FRONTEND_IMAGE_TAG: "sha-test",
      HEALTH_RETRIES: "1",
      HEALTH_SLEEP_SECONDS: "0",
    });

    expect(result.status).toBe(0);
    expect(readEnvFile()).toMatchObject({
      ACTIVE_COLOR: "green",
      PREVIOUS_COLOR: "blue",
      BACKEND_PRIVATE_IP: "10.0.0.4",
      BACKEND_HOST: "10.0.0.4:3002",
      BLUE_BACKEND_HOST: "10.0.0.4:3001",
      GREEN_BACKEND_HOST: "10.0.0.4:3002",
      BACKEND_IMAGE_TAG: "sha-test",
      FRONTEND_IMAGE_TAG: "sha-test",
    });
    expect(readLog("docker.log")).toEqual([
      `compose -f ${path.join(tmp, "backend-compose.yml")} pull backend-green`,
      `compose -f ${path.join(tmp, "backend-compose.yml")} up -d backend-green`,
    ]);
    expect(readLog("curl.log")).toEqual(["-fsS --max-time 5 http://127.0.0.1:3002/health"]);
  });

  it("leaves active-color.env unchanged when the inactive color is unhealthy", () => {
    const before = readFileSync(path.join(tmp, "active-color.env"), "utf8");
    const result = runScript(deployScript, {
      CURL_EXIT: "1",
      DOCKER_INSPECT_STATUS: "unhealthy",
      HEALTH_RETRIES: "1",
      HEALTH_SLEEP_SECONDS: "0",
    });

    expect(result.status).toBe(1);
    expect(readFileSync(path.join(tmp, "active-color.env"), "utf8")).toBe(before);
    expect(result.stderr).toContain("failed health checks");
  });

  it("honors an explicit TARGET_COLOR override", () => {
    writeFileSync(path.join(tmp, "active-color.env"), [
      "ACTIVE_COLOR=green",
      "PREVIOUS_COLOR=blue",
      "BACKEND_PRIVATE_IP=10.0.0.4",
      "BACKEND_HOST=10.0.0.4:3002",
      "BACKEND_IMAGE_TAG=old-backend",
      "FRONTEND_IMAGE_TAG=old-frontend",
      "",
    ].join("\n"));

    const result = runScript(deployScript, {
      TARGET_COLOR: "green",
      BACKEND_IMAGE_TAG: "sha-test",
      HEALTH_RETRIES: "1",
      HEALTH_SLEEP_SECONDS: "0",
    });

    expect(result.status).toBe(0);
    expect(readEnvFile()).toMatchObject({
      ACTIVE_COLOR: "green",
      PREVIOUS_COLOR: "green",
      BACKEND_HOST: "10.0.0.4:3002",
    });
    expect(readLog("docker.log")).toContain(
      `compose -f ${path.join(tmp, "backend-compose.yml")} pull backend-green`
    );
  });
});

describe("deploy/blue-green/rollback-blue-green.sh", () => {
  it("switches nginx back to PREVIOUS_COLOR and recreates frontend", () => {
    writeFileSync(path.join(tmp, "active-color.env"), [
      "ACTIVE_COLOR=green",
      "PREVIOUS_COLOR=blue",
      "BACKEND_PRIVATE_IP=10.0.0.4",
      "BACKEND_HOST=10.0.0.4:3002",
      "BLUE_BACKEND_HOST=10.0.0.4:3001",
      "GREEN_BACKEND_HOST=10.0.0.4:3002",
      "BACKEND_IMAGE_TAG=sha-backend",
      "FRONTEND_IMAGE_TAG=sha-frontend",
      "UPDATED_AT=2026-01-01T00:00:00Z",
      "",
    ].join("\n"));

    const result = runScript(rollbackScript);

    expect(result.status).toBe(0);
    expect(readEnvFile()).toMatchObject({
      ACTIVE_COLOR: "blue",
      PREVIOUS_COLOR: "green",
      BACKEND_HOST: "10.0.0.4:3001",
      BACKEND_IMAGE_TAG: "sha-backend",
      FRONTEND_IMAGE_TAG: "sha-frontend",
    });
    expect(readLog("docker.log")).toEqual([
      `compose --env-file ${path.join(tmp, "active-color.env")} -f ${path.join(tmp, "nginx-compose.yml")} up -d frontend`,
    ]);
  });
});
