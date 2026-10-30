#!/usr/bin/env bash
# =============================================================================
# start-meetzy.sh — install, verify and start the Meetzy project
#
# Project layout (taken from the ZIP):
#   Backend/   Express 5 + Socket.IO + Mongoose API   -> started with: node app.js
#   Frontend/  React 19 + Vite 8 app                  -> started with: npm run dev
#
# What this script does
#   1. Finds the project root and checks Node, npm and ffmpeg.
#   2. Installs dependencies with `npm ci` (exact versions from package-lock.json).
#   3. Checks Backend/.env (or exported env vars), MongoDB and the AI-provider APIs.
#   4. Runs the checks the project supports (syntax check, lint, frontend build).
#   5. Starts the backend and the frontend dev server.
#
# Safety guarantees
#   * Never edits, creates or deletes any project file. The only thing written
#     into the project is node_modules/ (that is what installing means).
#   * Never creates a .env, never prints secret values, never calls any
#     paid / state-changing API (only read-only "who am I" style requests).
#   * The frontend build is written to a temporary directory outside the
#     project, and that directory is removed afterwards.
#   * An existing node_modules/ is never removed unless you pass --reinstall.
#
# Usage:  ./start-meetzy.sh [options]      (see --help)
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_TMP="$(mktemp -d)"   # scratch space outside the project; removed on exit
trap 'rm -rf "$WORK_TMP"' EXIT

# ---------- output helpers ---------------------------------------------------
if [ -t 1 ]; then
  R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'; B=$'\033[34m'; BOLD=$'\033[1m'; N=$'\033[0m'
else
  R=""; G=""; Y=""; B=""; BOLD=""; N=""
fi
ERRORS=0
WARNINGS=0
step() { printf '\n%s== %s ==%s\n' "$BOLD$B" "$*" "$N"; }
ok()   { printf '  %s[ OK ]%s %s\n' "$G" "$N" "$*"; }
info() { printf '  %s[info]%s %s\n' "$B" "$N" "$*"; }
warn() { printf '  %s[WARN]%s %s\n' "$Y" "$N" "$*"; WARNINGS=$((WARNINGS + 1)); }
fail() { printf '  %s[FAIL]%s %s\n' "$R" "$N" "$*"; ERRORS=$((ERRORS + 1)); }
die()  { printf '%s[FATAL]%s %s\n' "$R" "$N" "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: start-meetzy.sh [options]

  --project-dir DIR   Folder that contains Backend/ and Frontend/ (auto-detected
                      if the script sits next to / above them)
  --backend-only      Install, check and start only the backend
  --frontend-only     Install, check and start only the frontend
  --check-only        Install and run all checks, but do not start anything
  --skip-network      Skip the MongoDB / Groq  connectivity checks
  --reinstall         Run `npm ci` even if node_modules/ already exists
                      (npm ci DELETES and recreates node_modules/ - it is
                      regenerable, but it is the one destructive option here)
  -h, --help          Show this help
EOF
}

# ---------- arguments --------------------------------------------------------
PROJECT_DIR=""; MODE="all"; CHECK_ONLY=0; SKIP_NET=0; REINSTALL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --project-dir) shift; [ $# -gt 0 ] || die "--project-dir needs a value"; PROJECT_DIR="$1" ;;
    --backend-only)  MODE="backend" ;;
    --frontend-only) MODE="frontend" ;;
    --check-only)    CHECK_ONLY=1 ;;
    --skip-network)  SKIP_NET=1 ;;
    --reinstall)     REINSTALL=1 ;;
    -h|--help) usage; exit 0 ;;
    *) usage; die "Unknown option: $1" ;;
  esac
  shift
done
WANT_BACKEND=1; WANT_FRONTEND=1
[ "$MODE" = "backend" ]  && WANT_FRONTEND=0
[ "$MODE" = "frontend" ] && WANT_BACKEND=0

# ---------- 1. locate the project -------------------------------------------
is_root() { [ -f "$1/Backend/app.js" ] && [ -f "$1/Backend/package.json" ] && [ -f "$1/Frontend/package.json" ]; }

find_root() {
  local c
  if [ -n "$PROJECT_DIR" ]; then
    is_root "$PROJECT_DIR" && { (cd "$PROJECT_DIR" && pwd); return 0; }
    return 1
  fi
  for c in "$SCRIPT_DIR" "$PWD"; do
    is_root "$c" && { echo "$c"; return 0; }
  done
  local found=() f d
  for d in "$SCRIPT_DIR" "$PWD"; do
    while IFS= read -r f; do
      c="$(dirname "$(dirname "$f")")"
      is_root "$c" && found+=("$c")
    done < <(find "$d" -maxdepth 4 -path '*/node_modules' -prune -o -path '*/Backend/app.js' -print 2>/dev/null)
  done
  if [ "${#found[@]}" -eq 0 ]; then return 1; fi
  local uniq; uniq="$(printf '%s\n' "${found[@]}" | sort -u)"
  if [ "$(printf '%s\n' "$uniq" | wc -l)" -ne 1 ]; then
    echo "MULTIPLE" ; printf '%s\n' "$uniq"; return 2
  fi
  echo "$uniq"
}

step "Locating project"
ROOT_OUT="$(find_root)"; rc=$?
if [ $rc -eq 2 ]; then
  printf '%s\n' "$ROOT_OUT" | tail -n +2 | sed 's/^/    candidate: /'
  die "More than one project found; pass --project-dir DIR."
elif [ $rc -ne 0 ]; then
  die "Could not find a folder containing Backend/app.js, Backend/package.json and Frontend/package.json. Pass --project-dir DIR."
fi
ROOT="$ROOT_OUT"; BACKEND="$ROOT/Backend"; FRONTEND="$ROOT/Frontend"
ok "Project root: $ROOT"

# ---------- 2. required commands --------------------------------------------
step "Checking required commands"
case "$(uname -s)" in
  Linux|Darwin) ;;
  *) warn "Untested platform '$(uname -s)'. On Windows use WSL (the backend's ffmpeg lookup also differs there)." ;;
esac

if command -v node >/dev/null 2>&1; then
  NODE_V="$(node -p 'process.versions.node')"
  # Needed by the lockfiles: vite 8 -> ^20.19 || >=22.12 ; mongoose 9 -> >=20.19
  if [ "$(node -p 'const [a,b]=process.versions.node.split(".").map(Number);(a===20&&b>=19)||(a===22&&b>=12)||a>22?"y":"n"')" = "y" ]; then
    ok "node v$NODE_V (project needs ^20.19 or >=22.12)"
  else
    fail "node v$NODE_V is too old/unsupported. Vite 8 and Mongoose 9 need Node ^20.19 or >=22.12 (the Dockerfile uses node:20)."
  fi
else
  fail "node is not installed (need ^20.19 or >=22.12)."
fi
command -v npm >/dev/null 2>&1 && ok "npm $(npm -v)" || fail "npm is not installed."

if [ "$WANT_BACKEND" -eq 1 ]; then
  if command -v ffmpeg >/dev/null 2>&1; then
    ok "ffmpeg found ($(ffmpeg -version 2>/dev/null | head -n1 | cut -d' ' -f1-3))"
  else
    fail "ffmpeg not found. The backend converts every audio chunk with it (see Backend/utils/socket.js and the Dockerfile's apt-get install ffmpeg). Install it, e.g. 'sudo apt-get install ffmpeg' or 'brew install ffmpeg'."
  fi
fi

if [ "$ERRORS" -gt 0 ]; then die "Fix the problems above and re-run."; fi

# ---------- 3. install dependencies -----------------------------------------
install_deps() {  # $1 = dir, $2 = label
  local dir="$1" label="$2"
  [ -f "$dir/package-lock.json" ] || { fail "$label: package-lock.json missing; refusing to guess versions."; return; }
  if [ -d "$dir/node_modules" ] && [ "$REINSTALL" -eq 0 ]; then
    if (cd "$dir" && npm ls --depth=0 >/dev/null 2>&1); then
      ok "$label: node_modules already present and consistent with package.json (skipped install)"
    else
      fail "$label: node_modules exists but does not match package.json/lock. I will not delete it automatically; re-run with --reinstall."
    fi
  else
    info "$label: running npm ci ..."
    (cd "$dir" && npm ci --no-audit --no-fund) 2>&1 | tail -n 5
    if (cd "$dir" && npm ls --depth=0 >/dev/null 2>&1); then
      ok "$label: dependencies installed"
    else
      fail "$label: npm ci failed or left an inconsistent tree."
    fi
  fi
}

step "Installing dependencies"
[ "$WANT_BACKEND" -eq 1 ]  && install_deps "$BACKEND"  "Backend"
[ "$WANT_FRONTEND" -eq 1 ] && install_deps "$FRONTEND" "Frontend"
[ "$ERRORS" -gt 0 ] && die "Dependency installation problems; see above."

# ---------- 4. configuration & services (backend) ---------------------------
BACKEND_PORT=7777
if [ "$WANT_BACKEND" -eq 1 ]; then
  step "Backend configuration (Backend/.env or exported variables)"
  if [ -f "$BACKEND/.env" ]; then
    ok "Backend/.env found (values are never printed)"
  else
    warn "Backend/.env not found. The backend reads it from its own folder via dotenv; exported shell variables also work. This script will NOT create it."
  fi

  # Mirrors the app: dotenv.config() from the Backend folder, existing env vars win.
  ENV_REPORT="$(cd "$BACKEND" && node - <<'JS'
require("dotenv").config({ quiet: true });
const e = process.env, has = (k) => !!(e[k] && e[k].trim());
// Required at boot: the SDK constructors / mongoose throw without these.
for (const k of ["MONGO_URI", "GROQ_API_KEY", "RAZORPAY_KEY_ID"])
  console.log((has(k) ? "OK:" : "MISSING:") + k);
// Needed for payments to work, but the server boots without them.
for (const k of ["RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"])
  console.log((has(k) ? "OK:" : "OPT_MISSING:") + k);
console.log("PORT:" + (has("PORT") ? e.PORT.trim() : "7777"));
if (has("RAZORPAY_KEY_ID")) {
  const id = e.RAZORPAY_KEY_ID.trim();
  console.log("RZP:" + (id.startsWith("rzp_live_") ? "live" : id.startsWith("rzp_test_") ? "test" : "unknown"));
}
JS
)"
  while IFS= read -r line; do
    case "$line" in
      OK:*)          ok   "${line#OK:} is set" ;;
      MISSING:*)     fail "${line#MISSING:} is missing - the backend crashes at startup without it" ;;
      OPT_MISSING:*) warn "${line#OPT_MISSING:} is missing - server starts, but Razorpay payments / webhooks will fail" ;;
      PORT:*)        BACKEND_PORT="${line#PORT:}" ;;
      RZP:live)      warn "RAZORPAY_KEY_ID is a LIVE key - payments made while testing would be real. Use an rzp_test_ key." ;;
      RZP:test)      ok   "Razorpay key is a test key" ;;
      RZP:unknown)   warn "RAZORPAY_KEY_ID has an unrecognised prefix (expected rzp_test_ / rzp_live_)" ;;
    esac
  done <<< "$ENV_REPORT"
  info "Backend will listen on port $BACKEND_PORT"

  info "Note: JWT signing uses a secret hard-coded in the source (not an env var), so no JWT_SECRET is needed."
  if [ "$SKIP_NET" -eq 0 ] && [ "$ERRORS" -eq 0 ]; then
    step "Connectivity (read-only requests)"
    NET_REPORT="$(cd "$BACKEND" && node - <<'JS'
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const e = process.env;
(async () => {
  try {
    await mongoose.connect(e.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("OK:MongoDB reachable and answered ping");
  } catch (err) {
    console.log("FAIL:MongoDB connection failed: " + String(err.message).split("\n")[0]);
  } finally { try { await mongoose.disconnect(); } catch (_) {} }

  const probe = async (name, url, key) => {
    try {
      const r = await fetch(url, { headers: { Authorization: "Bearer " + key }, signal: AbortSignal.timeout(8000) });
      if (r.status === 401 || r.status === 403) console.log(`FAIL:${name} rejected the API key (HTTP ${r.status})`);
      else if (r.ok) console.log(`OK:${name} reachable and key accepted`);
      else console.log(`WARN:${name} answered HTTP ${r.status}`);
    } catch (err) { console.log(`WARN:${name} not reachable from here (${(err.cause && (err.cause.code || err.cause.message)) || err.message}); live transcription/summaries need it`); }
  };
  await probe("Groq API", "https://api.groq.com/openai/v1/models", e.GROQ_API_KEY);
  
})();
JS
)"
    while IFS= read -r line; do
      case "$line" in
        OK:*)   ok   "${line#OK:}" ;;
        WARN:*) warn "${line#WARN:}" ;;
        FAIL:*) fail "${line#FAIL:}" ;;
      esac
    done <<< "$NET_REPORT"
    info "Razorpay is not probed (its API would create billing objects); only key presence/type is checked."
  elif [ "$SKIP_NET" -eq 1 ]; then
    info "Connectivity checks skipped (--skip-network)"
  fi
fi

# ---------- 5. project checks ------------------------------------------------
step "Project checks"
if [ "$WANT_BACKEND" -eq 1 ]; then
  bad=0
  while IFS= read -r -d '' f; do
    node --check "$f" 2>"$WORK_TMP/syntax" || { fail "Syntax error in ${f#$ROOT/}: $(head -n1 "$WORK_TMP/syntax")"; bad=1; }
  done < <(find "$BACKEND" -name node_modules -prune -o -name '*.js' -print0)
  [ "$bad" -eq 0 ] && ok "Backend: all .js files pass 'node --check'"
  if grep -q 'no test specified' "$BACKEND/package.json"; then
    info "Backend: 'npm test' is only npm's placeholder (always exits 1), so no tests are run."
  fi
  [ -f "$BACKEND/index.js" ] || info "Backend: package.json 'main' points at index.js which does not exist; the real entry point is app.js (as used by the Dockerfile)."
fi

if [ "$WANT_FRONTEND" -eq 1 ]; then
  if (cd "$FRONTEND" && npx --no-install eslint . >"$WORK_TMP/lint" 2>&1); then
    ok "Frontend: eslint clean"
  else
    warn "Frontend: eslint reports problems already present in the source ($(grep -Eo '[0-9]+ problems? \([^)]*\)' "$WORK_TMP/lint" | tail -n1)). Not blocking; run 'npm run lint' in Frontend/ to see them."
  fi

  BUILD_TMP="$WORK_TMP/build"; mkdir -p "$BUILD_TMP"
  if (cd "$FRONTEND" && npx --no-install vite build --outDir "$BUILD_TMP/dist" --emptyOutDir >"$BUILD_TMP/build.log" 2>&1); then
    ok "Frontend: production build succeeds (output went to a temp dir, not dist/)"
  else
    fail "Frontend: vite build failed:"; tail -n 15 "$BUILD_TMP/build.log" | sed 's/^/        /'
  fi

  CONST_LINE="$(grep -E '^[[:space:]]*export const BASE_URL' "$FRONTEND/constants.js" 2>/dev/null | head -n1)"
  if [ -n "$CONST_LINE" ]; then
    case "$CONST_LINE" in
      *localhost*|*127.0.0.1*) ok "Frontend BASE_URL points at a local backend: ${CONST_LINE#*=}" ;;
      *) warn "Frontend/constants.js BASE_URL is hard-coded to a REMOTE backend:${CONST_LINE#*=}"
         warn "  The local frontend will therefore NOT talk to the backend started here. To use your local backend, edit Frontend/constants.js yourself (a commented localhost line is already there). This script will not change source files." ;;
    esac
  fi
fi

# ---------- 6. ports ---------------------------------------------------------
port_free() { node -e 'const s=require("net").createServer();s.once("error",()=>process.exit(1));s.listen(+process.argv[1],"0.0.0.0",()=>s.close(()=>process.exit(0)))' "$1"; }
step "Ports"
if [ "$WANT_BACKEND" -eq 1 ]; then
  port_free "$BACKEND_PORT" && ok "Port $BACKEND_PORT (backend) is free" || fail "Port $BACKEND_PORT is already in use. Stop that process or set PORT to another value."
fi
if [ "$WANT_FRONTEND" -eq 1 ]; then
  port_free 5173 && ok "Port 5173 (frontend) is free" || fail "Port 5173 is already in use. The backend's CORS only allows http://localhost:5173, so another port would not work."
fi

# ---------- summary / start --------------------------------------------------
step "Summary"
printf '  errors: %s, warnings: %s\n' "$ERRORS" "$WARNINGS"
[ "$ERRORS" -gt 0 ] && die "Not starting: fix the [FAIL] items above."
if [ "$CHECK_ONLY" -eq 1 ]; then ok "All checks passed (--check-only: nothing started)."; exit 0; fi

PIDS=()
cleanup() {
  trap - INT TERM EXIT
  rm -rf "$WORK_TMP"
  echo; info "Stopping ..."
  if [ "${#PIDS[@]}" -gt 0 ]; then
    for p in "${PIDS[@]}"; do kill -TERM -- "-$p" 2>/dev/null || kill -TERM "$p" 2>/dev/null; done
  fi
  wait 2>/dev/null
  exit 0
}
trap cleanup INT TERM EXIT
set -m   # each service gets its own process group so Ctrl+C stops everything cleanly

# Line-buffered prefixing in pure bash (awk/sed buffering differs between mawk, gawk and BSD).
prefix() { local line; while IFS= read -r line || [ -n "$line" ]; do printf '%s %s\n' "$1" "$line"; done; }

step "Starting"
if [ "$WANT_BACKEND" -eq 1 ]; then
  ( cd "$BACKEND" && exec node app.js ) > >(prefix "[backend] ") 2>&1 &
  PIDS+=("$!"); info "Backend  -> http://localhost:$BACKEND_PORT   (node app.js)"
fi
if [ "$WANT_FRONTEND" -eq 1 ]; then
  ( cd "$FRONTEND" && exec npm run dev -- --strictPort ) > >(prefix "[frontend]") 2>&1 &
  PIDS+=("$!"); info "Frontend -> http://localhost:5173   (npm run dev)"
fi
info "Press Ctrl+C to stop."

while :; do
  for p in "${PIDS[@]}"; do
    if ! kill -0 "$p" 2>/dev/null; then
      warn "A service exited (pid $p). Check its output above; stopping the rest."
      exit 1
    fi
  done
  sleep 2
done