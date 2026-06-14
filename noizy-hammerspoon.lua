-- ─────────────────────────────────────────────────────────────────────────────
--  noizy-hammerspoon.lua — NOIZY Empire desktop API bridge
--
--  Exposes a SMALL, localhost-only, token-gated HTTP API so the swarm
--  (voice-bridge / n8n / Heaven / a scheduled task) can drive this Mac:
--  notify, speak, launch apps, tile windows, relay to Heaven.
--
--  INSTALL
--    1. Put this file in ~/.hammerspoon/
--    2. In ~/.hammerspoon/init.lua add:   require("noizy-hammerspoon")
--    3. Set a secret in your shell env:   export NOIZY_HS_TOKEN="a-long-random-string"
--       (launch Hammerspoon from a shell that has it, or hardcode below — your call)
--    4. Reload Hammerspoon (menubar → Reload Config).
--
--  TEST
--    curl -s -H "Authorization: Bearer $NOIZY_HS_TOKEN" \
--         http://127.0.0.1:9876/status
--    curl -s -X POST -H "Authorization: Bearer $NOIZY_HS_TOKEN" \
--         -d '{"title":"NOIZY","text":"swarm online"}' \
--         http://127.0.0.1:9876/notify
-- ─────────────────────────────────────────────────────────────────────────────

local PORT  = 9876
local TOKEN = os.getenv("NOIZY_HS_TOKEN") or "CHANGE_ME_BEFORE_USE"

local function decode(body)
  if not body or body == "" then return {} end
  local ok, t = pcall(hs.json.decode, body)
  return (ok and type(t) == "table") and t or {}
end

local function authed(headers)
  -- header keys can arrive in any case; check both
  local h = headers["Authorization"] or headers["authorization"] or ""
  return h == ("Bearer " .. TOKEN) and TOKEN ~= "CHANGE_ME_BEFORE_USE"
end

-- ── route handlers: each returns (luaTable, statusCode) ──────────────────────
local routes = {}

routes["GET /status"] = function()
  local s = hs.screen.primaryScreen():frame()
  local app = hs.application.frontmostApplication()
  return {
    ok = true,
    service = "noizy-hammerspoon",
    front_app = app and app:name() or nil,
    screen = { w = s.w, h = s.h },
    battery = hs.battery.percentage(),
  }, 200
end

routes["POST /notify"] = function(body)
  local d = decode(body)
  hs.notify.new({ title = d.title or "NOIZY", informativeText = d.text or "" }):send()
  return { ok = true, sent = true }, 200
end

routes["POST /say"] = function(body)
  local d = decode(body)
  local text = d.text or ""
  if text == "" then return { ok = false, error = "no text" }, 400 end
  hs.task.new("/usr/bin/say", nil, { text }):start()
  return { ok = true, spoke = text }, 200
end

routes["POST /app"] = function(body)
  local d = decode(body)
  if not d.name then return { ok = false, error = "no app name" }, 400 end
  hs.application.launchOrFocus(d.name)
  return { ok = true, launched = d.name }, 200
end

-- Tile the focused window: half = "left"|"right"|"full"
routes["POST /layout"] = function(body)
  local d = decode(body)
  local win = hs.window.focusedWindow()
  if not win then return { ok = false, error = "no focused window" }, 400 end
  local f = win:screen():frame()
  local half = d.half or "full"
  if half == "left"  then f.w = f.w / 2
  elseif half == "right" then f.x = f.x + f.w / 2; f.w = f.w / 2 end
  win:setFrame(f)
  return { ok = true, tiled = half }, 200
end

-- Relay a GET to the Heaven worker (handy for swarm health from the desktop)
routes["GET /heaven"] = function()
  local code, body = hs.http.get("https://heaven.rsp-5f3.workers.dev/", nil)
  return { ok = true, heaven_status = code, body = body }, 200
end

-- ── server ───────────────────────────────────────────────────────────────────
local server = hs.httpserver.new(false, false)
server:setPort(PORT)
server:setInterface("localhost")  -- never expose to the network
server:setCallback(function(method, path, headers, body)
  if not authed(headers) then
    return hs.json.encode({ ok = false, error = "unauthorized" }), 401, {}
  end
  local handler = routes[method .. " " .. path]
  if not handler then
    return hs.json.encode({ ok = false, error = "no route: " .. method .. " " .. path }), 404, {}
  end
  local ok, result, code = pcall(handler, body)
  if not ok then
    return hs.json.encode({ ok = false, error = tostring(result) }), 500, {}
  end
  return hs.json.encode(result), code or 200, { ["Content-Type"] = "application/json" }
end)
server:start()

hs.notify.new({ title = "NOIZY bridge", informativeText = "Desktop API on :" .. PORT }):send()
print("noizy-hammerspoon: listening on http://127.0.0.1:" .. PORT)

return { port = PORT }
