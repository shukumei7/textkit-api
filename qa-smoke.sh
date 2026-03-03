#!/usr/bin/env bash
# TextKit API — Production Smoke Test
# Run: bash qa-smoke.sh
# Tests all endpoints against https://www.textkitapi.com

BASE="https://www.textkitapi.com"
DEMO_KEY="demo"
ADMIN_KEY="trhrtbyhrythyujrtutyn5675n6ui6645m567m4585676n456n45y65um6tun56"
# LOCAL_KEY has MEGA tier (unlimited rate limits) — used for LLM endpoint tests
LOCAL_KEY=$(grep LOCAL_API_KEY "$(dirname "$0")/.env" | cut -d= -f2)

PASS=0
FAIL=0
ERRORS=()

pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); ERRORS+=("$1"); }

check_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then pass "$label (HTTP $actual)";
  else fail "$label — expected HTTP $expected, got HTTP $actual"; fi
}

check_field() {
  local label="$1" field="$2" body="$3"
  if echo "$body" | grep -q "\"$field\""; then pass "$label (has '$field')";
  else fail "$label — missing field '$field' in response"; fi
}

check_no_null() {
  local label="$1" body="$2"
  if echo "$body" | grep -qE '": *null'; then
    fail "$label — null field found (Zapier compatibility issue)"
  else
    pass "$label (no null fields)"
  fi
}

SHORT_TEXT="TextKit makes AI text features easy for developers. It has 9 endpoints for summarizing, rewriting, and optimizing content."

echo ""
echo "=========================================="
echo "  TextKit API — Production Smoke Test"
echo "  Target: $BASE"
echo "=========================================="

# ------------------------------------------
echo ""
echo "--- HEALTH ---"
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" "$BASE/health")
check_status "GET /health" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "GET /health response" "status" "$body"

# ------------------------------------------
echo ""
echo "--- AUTH ENDPOINTS ---"

# Register: missing fields
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" -d '{}')
check_status "POST /auth/register (missing fields)" "400" "$r"
body=$(cat /tmp/tk_body)
if echo "$body" | grep -q "MISSING_FIELDS"; then pass "POST /auth/register — correct error code MISSING_FIELDS";
else fail "POST /auth/register — expected MISSING_FIELDS code, got: $body"; fi

# Register: weak password
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" -d '{"email":"qa@test.com","password":"short"}')
check_status "POST /auth/register (weak password)" "400" "$r"
body=$(cat /tmp/tk_body)
if echo "$body" | grep -q "WEAK_PASSWORD"; then pass "POST /auth/register — correct error code WEAK_PASSWORD";
else fail "POST /auth/register — expected WEAK_PASSWORD code, got: $body"; fi

# Login: wrong password
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" -d '{"email":"allbate@gmail.com","password":"wrongpassword999"}')
check_status "POST /auth/login (wrong password)" "401" "$r"

# Login: missing fields
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" -d '{}')
check_status "POST /auth/login (missing fields)" "400" "$r"

# Logout (no auth needed)
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/auth/logout")
check_status "POST /auth/logout" "200" "$r"

# /auth/me without auth
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" "$BASE/auth/me")
check_status "GET /auth/me (no auth)" "401" "$r"

# Forgot password (always returns 200)
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/auth/forgot-password" \
  -H "Content-Type: application/json" -d '{"email":"nonexistent@test.com"}')
check_status "POST /auth/forgot-password" "200" "$r"

# Forgot password: missing email
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/auth/forgot-password" \
  -H "Content-Type: application/json" -d '{}')
check_status "POST /auth/forgot-password (missing email)" "400" "$r"

# ------------------------------------------
echo ""
echo "--- GET /auth/verify (Zapier credential endpoint) ---"

# With demo key
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" "$BASE/auth/verify" \
  -H "x-api-key: $DEMO_KEY")
check_status "GET /auth/verify (demo key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "GET /auth/verify" "success" "$body"
check_field "GET /auth/verify" "tier" "$body"
check_field "GET /auth/verify" "user_id" "$body"
check_field "GET /auth/verify" "requests_today" "$body"
check_no_null "GET /auth/verify" "$body"

# Without auth
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" "$BASE/auth/verify")
check_status "GET /auth/verify (no auth)" "401" "$r"

# ------------------------------------------
echo ""
echo "--- V1 AUTH GUARDS (all should be 401 with no key) ---"

for ep in repurpose summarize rewrite "seo/meta" "email/subject-lines" headlines "extract/keywords" "translate/tone" compare; do
  r=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/$ep" \
    -H "Content-Type: application/json" -d '{"text":"test"}')
  check_status "POST /api/v1/$ep (no auth)" "401" "$r"
done

# ------------------------------------------
echo ""
echo "--- V1 VALIDATION ERRORS (demo key, missing required fields) ---"

for ep in repurpose summarize rewrite "seo/meta" "email/subject-lines" headlines "extract/keywords" "translate/tone" compare; do
  r=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/$ep" \
    -H "x-api-key: $DEMO_KEY" \
    -H "Content-Type: application/json" -d '{}')
  check_status "POST /api/v1/$ep (missing text, demo key)" "400" "$r"
done

# ------------------------------------------
echo ""
echo "--- V1 LLM CALLS (all 9 endpoints, local MEGA key, minimal text) ---"
echo "    (Using MEGA-tier key to avoid per-minute rate limit interference)"

# Summarize
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/v1/summarize" \
  -H "x-api-key: $LOCAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$SHORT_TEXT\",\"length\":\"short\"}")
check_status "POST /api/v1/summarize (MEGA key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "POST /api/v1/summarize" "summary" "$body"
check_no_null "POST /api/v1/summarize" "$body"

# Rewrite
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/v1/rewrite" \
  -H "x-api-key: $LOCAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$SHORT_TEXT\",\"audience\":\"general\"}")
check_status "POST /api/v1/rewrite (MEGA key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "POST /api/v1/rewrite" "rewritten" "$body"
check_no_null "POST /api/v1/rewrite" "$body"

# Keywords
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/v1/extract/keywords" \
  -H "x-api-key: $LOCAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$SHORT_TEXT\"}")
check_status "POST /api/v1/extract/keywords (MEGA key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "POST /api/v1/extract/keywords" "keywords" "$body"
check_no_null "POST /api/v1/extract/keywords" "$body"

# SEO meta
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/v1/seo/meta" \
  -H "x-api-key: $LOCAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$SHORT_TEXT\"}")
check_status "POST /api/v1/seo/meta (MEGA key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "POST /api/v1/seo/meta" "title" "$body"
check_no_null "POST /api/v1/seo/meta" "$body"

# Tone
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/v1/translate/tone" \
  -H "x-api-key: $LOCAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$SHORT_TEXT\",\"targetTone\":\"professional\"}")
check_status "POST /api/v1/translate/tone (MEGA key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "POST /api/v1/translate/tone" "rewritten" "$body"
check_no_null "POST /api/v1/translate/tone" "$body"

# Headlines
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/v1/headlines" \
  -H "x-api-key: $LOCAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$SHORT_TEXT\"}")
check_status "POST /api/v1/headlines (MEGA key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "POST /api/v1/headlines" "headlines" "$body"
check_no_null "POST /api/v1/headlines" "$body"

# Repurpose
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/v1/repurpose" \
  -H "x-api-key: $LOCAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$SHORT_TEXT\",\"platform\":\"twitter\"}")
check_status "POST /api/v1/repurpose (MEGA key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "POST /api/v1/repurpose" "repurposed" "$body"
check_no_null "POST /api/v1/repurpose" "$body"

# Email subject lines
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/v1/email/subject-lines" \
  -H "x-api-key: $LOCAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$SHORT_TEXT\"}")
check_status "POST /api/v1/email/subject-lines (MEGA key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "POST /api/v1/email/subject-lines" "subjects" "$body"
check_no_null "POST /api/v1/email/subject-lines" "$body"

# Compare (needs two texts)
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/v1/compare" \
  -H "x-api-key: $LOCAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text1\":\"TextKit makes AI easy.\",\"text2\":\"TextKit simplifies AI text processing for developers.\"}")
check_status "POST /api/v1/compare (MEGA key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "POST /api/v1/compare" "similarity" "$body"
check_no_null "POST /api/v1/compare" "$body"

# ------------------------------------------
echo ""
echo "--- POST /api/product-description ---"

PRODUCT_PAYLOAD='{"name":"Handmade Ceramic Mug","materials":"stoneware clay, food-safe glaze","features":"dishwasher safe, holds 12oz","style":"artisan","targetBuyer":"coffee lovers"}'

# Anonymous (no auth)
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/product-description" \
  -H "Content-Type: application/json" -d "$PRODUCT_PAYLOAD")
check_status "POST /api/product-description (anonymous)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "POST /api/product-description (anon)" "title" "$body"
check_field "POST /api/product-description (anon)" "description" "$body"
check_field "POST /api/product-description (anon)" "tags" "$body"
check_field "POST /api/product-description (anon)" "meta" "$body"
check_field "POST /api/product-description (anon)" "tries_remaining" "$body"
check_no_null "POST /api/product-description (anon)" "$body"

# With local key (authenticated, MEGA tier, no rate limit issues)
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/product-description" \
  -H "x-api-key: $LOCAL_KEY" \
  -H "Content-Type: application/json" -d "$PRODUCT_PAYLOAD")
check_status "POST /api/product-description (MEGA key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "POST /api/product-description (MEGA key)" "title" "$body"
check_field "POST /api/product-description (MEGA key)" "tags" "$body"
check_no_null "POST /api/product-description (MEGA key)" "$body"

# Missing required field
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/product-description" \
  -H "Content-Type: application/json" -d '{}')
check_status "POST /api/product-description (missing name)" "400" "$r"
body=$(cat /tmp/tk_body)
if echo "$body" | grep -q "VALIDATION"; then pass "POST /api/product-description — correct VALIDATION error code";
else fail "POST /api/product-description — expected VALIDATION error, got: $body"; fi

# Invalid style enum
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" -X POST "$BASE/api/product-description" \
  -H "Content-Type: application/json" -d '{"name":"Test Product","style":"gothic"}')
check_status "POST /api/product-description (invalid style enum)" "400" "$r"

# ------------------------------------------
echo ""
echo "--- ADMIN ENDPOINTS ---"

# With admin key
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" "$BASE/admin/overview" \
  -H "X-Admin-Key: $ADMIN_KEY")
check_status "GET /admin/overview (admin key)" "200" "$r"
body=$(cat /tmp/tk_body)
check_field "GET /admin/overview" "totalRequests" "$body"
check_field "GET /admin/overview" "today" "$body"

r=$(curl -s -o /tmp/tk_body -w "%{http_code}" "$BASE/admin/endpoints" \
  -H "X-Admin-Key: $ADMIN_KEY")
check_status "GET /admin/endpoints (admin key)" "200" "$r"

r=$(curl -s -o /tmp/tk_body -w "%{http_code}" "$BASE/admin/tiers" \
  -H "X-Admin-Key: $ADMIN_KEY")
check_status "GET /admin/tiers (admin key)" "200" "$r"

r=$(curl -s -o /tmp/tk_body -w "%{http_code}" "$BASE/admin/registrations" \
  -H "X-Admin-Key: $ADMIN_KEY")
check_status "GET /admin/registrations (admin key)" "200" "$r"

# Admin with demo key should fail
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" "$BASE/admin/overview" \
  -H "x-api-key: $DEMO_KEY")
if [ "$r" = "401" ] || [ "$r" = "403" ]; then pass "GET /admin/overview (demo key) — correctly rejected (HTTP $r)";
else fail "GET /admin/overview (demo key) — should be 401/403, got $r"; fi

# ------------------------------------------
echo ""
echo "--- SWAGGER DOCS ---"
r=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/docs/")
check_status "GET /docs/ (Swagger UI)" "200" "$r"

# ------------------------------------------
echo ""
echo "--- ETSY TOOL PAGE ---"
r=$(curl -s -o /tmp/tk_body -w "%{http_code}" "$BASE/etsy.html")
check_status "GET /etsy.html" "200" "$r"
body=$(cat /tmp/tk_body)
if echo "$body" | grep -qi "product-description\|etsy"; then pass "GET /etsy.html — contains product description content";
else fail "GET /etsy.html — page may not be serving correct content"; fi

# ------------------------------------------
echo ""
echo "=========================================="
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "=========================================="

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  echo "FAILURES:"
  for e in "${ERRORS[@]}"; do echo "  ✗ $e"; done
fi

echo ""
exit $FAIL
