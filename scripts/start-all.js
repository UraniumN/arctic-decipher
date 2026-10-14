/**
 * start-all.js — Monorepo orchestrator.
 * Starts Tracer, ERP, and Dashboard concurrently from root with a single command.
 * 
 * Usage:
 *   npm run dev
 *   or: node scripts/start-all.js
 */

const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function checkPort(port) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(500);
    sock.on("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => {
      const sock4 = new net.Socket();
      sock4.setTimeout(500);
      sock4.on("connect", () => {
        sock4.destroy();
        resolve(true);
      });
      sock4.on("error", () => {
        sock4.destroy();
        resolve(false);
      });
      sock4.on("timeout", () => {
        sock4.destroy();
        resolve(false);
      });
      sock4.connect(port, "127.0.0.1");
    });
    sock.on("timeout", () => {
      sock.destroy();
      resolve(false);
    });
    sock.connect(port, "localhost");
  });
}

function startProcess(name, cmd, args, cwd, color) {
  const p = spawn(cmd, args, {
    cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  p.stdout.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    for (const l of lines) {
      if (l.trim()) console.log(`${color}[${name}]\x1b[0m ${l}`);
    }
  });

  p.stderr.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    for (const l of lines) {
      if (l.trim()) console.error(`${color}[${name}:err]\x1b[0m ${l}`);
    }
  });

  p.on("close", (code) => {
    console.log(`${color}[${name}]\x1b[0m Exited with code ${code}`);
  });

  return p;
}

async function main() {
  console.log("\x1b[36m===========================================================\x1b[0m");
  console.log("\x1b[36m  Starting LeakTrace Services Monorepo\x1b[0m");
  console.log("\x1b[36m===========================================================\x1b[0m\n");

  const processes = [];

  // 1. Tracer (Port 8000)
  const tracerRunning = await checkPort(8000);
  if (tracerRunning) {
    console.log("\x1b[32m[tracer]\x1b[0m Already running on http://localhost:8000");
  } else {
    console.log("\x1b[33m[tracer]\x1b[0m Starting FastAPI on http://localhost:8000 ...");
    const tracerProc = startProcess(
      "tracer",
      "python",
      ["-m", "uvicorn", "app.main:app", "--port", "8000"],
      path.join(ROOT, "tracer"),
      "\x1b[34m"
    );
    processes.push(tracerProc);
  }

  // 2. ERP (Port 3001)
  const erpRunning = await checkPort(3001);
  if (erpRunning) {
    console.log("\x1b[32m[erp]\x1b[0m Already running on http://localhost:3001");
  } else {
    console.log("\x1b[33m[erp]\x1b[0m Starting Express ERP on http://localhost:3001 ...");
    const erpProc = startProcess(
      "erp",
      "node",
      ["src/server.js"],
      path.join(ROOT, "erp"),
      "\x1b[35m"
    );
    processes.push(erpProc);
  }

  // 3. Dashboard (Port 5173)
  const dashRunning = await checkPort(5173);
  if (dashRunning) {
    console.log("\x1b[32m[dashboard]\x1b[0m Already running on http://localhost:5173");
  } else {
    console.log("\x1b[33m[dashboard]\x1b[0m Starting Vite Dashboard on http://localhost:5173 ...");
    const dashProc = startProcess(
      "dashboard",
      "npm",
      ["run", "dev"],
      path.join(ROOT, "dashboard"),
      "\x1b[32m"
    );
    processes.push(dashProc);
  }

  console.log("\n\x1b[32m✔ All services active!\x1b[0m");
  console.log("  ➜ Dashboard UI: \x1b[36mhttp://localhost:5173\x1b[0m");
  console.log("  ➜ ERP Service:  \x1b[36mhttp://localhost:3001\x1b[0m");
  console.log("  ➜ Tracer API:   \x1b[36mhttp://localhost:8000\x1b[0m\n");
  console.log("Press Ctrl+C to stop all services.\n");

  const cleanup = () => {
    console.log("\nShutting down services...");
    for (const p of processes) {
      try {
        p.kill();
      } catch (e) {}
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch(console.error);
