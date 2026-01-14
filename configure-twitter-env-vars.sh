#!/bin/bash
# Script to configure Twitter environment variables in Vercel
# Run this script from the project root directory

set -e

echo "🔧 Configuring Twitter Environment Variables in Vercel..."
echo ""
echo "Project: xbot (adminpoapfrs-projects)"
echo "Environment: production"
echo ""

TOKEN="8fu4bXgPHi5h9KXLTaM28UaL"
SCOPE="adminpoapfrs-projects"

# Function to add or update environment variable
add_env_var() {
  local VAR_NAME=$1
  local VAR_VALUE=$2

  echo "Setting $VAR_NAME..."

  # Remove existing variable if it exists (ignore errors)
  vercel env rm "$VAR_NAME" production --scope "$SCOPE" --token "$TOKEN" 2>/dev/null || true

  # Add new variable
  printf "%s" "$VAR_VALUE" | vercel env add "$VAR_NAME" production --scope "$SCOPE" --token "$TOKEN"

  echo "✅ $VAR_NAME configured"
  echo ""
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Configuring variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. TWITTER_BEARER_TOKEN - For read-only operations (searching tweets)
add_env_var "TWITTER_BEARER_TOKEN" "AAAAAAAAAAAAAAAAAAAAABsI5wEAAAAADWD3zOdt3zTHS9JbM1r0%2FO6HGXY%3DqQQuUc1CqOURBFjF9GcGaxkli1byzNXTKs9tGedw1sK1y3hRMb"

# 2. TWITTER_API_KEY - Consumer Key (OAuth 1.0a) for bot posting
add_env_var "TWITTER_API_KEY" "omPfOObGxBbLdalJ8ElwFT8xs"

# 3. TWITTER_API_SECRET - Consumer Key Secret (OAuth 1.0a) for bot posting
add_env_var "TWITTER_API_SECRET" "R8b58lMRqwACvAbwahtOHWBYdK6AkSUPUeKn056FFtCvXISr9V"

# 4. TWITTER_CLIENT_ID - OAuth 2.0 Client ID for user login
add_env_var "TWITTER_CLIENT_ID" "Nzl3OExveHNCc0hKUF9mR3hWZkM6MTpjaQ"

# 5. TWITTER_CLIENT_SECRET - OAuth 2.0 Client Secret for user login
add_env_var "TWITTER_CLIENT_SECRET" "FMEvbEHE4IVAvO2CDQm5yGnadcKxbTeSYqESTibJcmtNa1xZzM"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All Twitter environment variables configured!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Summary:"
echo "  ✓ TWITTER_BEARER_TOKEN (App-Only Auth for searching)"
echo "  ✓ TWITTER_API_KEY (OAuth 1.0a Consumer Key)"
echo "  ✓ TWITTER_API_SECRET (OAuth 1.0a Consumer Secret)"
echo "  ✓ TWITTER_CLIENT_ID (OAuth 2.0 for user login)"
echo "  ✓ TWITTER_CLIENT_SECRET (OAuth 2.0 for user login)"
echo ""
echo "🚀 Next steps:"
echo "  1. Verify variables: vercel env ls --scope $SCOPE --token $TOKEN"
echo "  2. Trigger a new deployment or wait for the next push"
echo "  3. Reconnect bot account in /admin after deployment"
echo ""
