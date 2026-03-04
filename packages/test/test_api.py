"""E2E API test script for the BTC coding challenge."""

import asyncio
import json
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

import websockets


def get_urls() -> tuple[str, str]:
    """Get API and WebSocket URLs from Terraform output."""
    result = subprocess.run(
        ["terraform", "output", "-json"],
        cwd="../terraform",
        capture_output=True,
        text=True,
        check=True,
    )
    outputs = json.loads(result.stdout)
    api_url = outputs["api_gateway_invoke_url"]["value"].rstrip("/")
    ws_url = outputs["websocket_api_url"]["value"]
    return api_url, ws_url


def test_price_freshness(api_url: str) -> bool:
    """Test that GET /price returns data updated within the last 60 seconds."""
    print("=" * 60)
    print("Test 1: GET /price — coin freshness check")
    print("=" * 60)

    url = f"{api_url}/price"
    print(f"  GET {url}")

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode())
    except Exception as e:
        print(f"  FAIL: request error — {e}")
        return False

    print(f"  Response: symbol={body.get('symbol')} price={body.get('price')}")

    last_updated_str = body.get("last_updated")
    if not last_updated_str:
        print("  FAIL: missing last_updated field")
        return False

    last_updated = datetime.fromisoformat(last_updated_str)
    now = datetime.now(timezone.utc)
    age = (now - last_updated).total_seconds()

    print(f"  last_updated: {last_updated_str}")
    print(f"  age: {age:.1f}s")

    if age > 60:
        print(f"  FAIL: data is {age:.1f}s old (max 60s)")
        return False

    print("  PASS")
    return True


async def test_websocket(ws_url: str) -> bool:
    """Test that a price update is received via WebSocket within 60 seconds."""
    print()
    print("=" * 60)
    print("Test 2: WebSocket — receive price update within 60s")
    print("=" * 60)

    print(f"  Connecting to {ws_url}")

    try:
        async with websockets.connect(ws_url) as ws:
            print("  Connected. Waiting up to 60s for a message...")
            message = await asyncio.wait_for(ws.recv(), timeout=60)
    except asyncio.TimeoutError:
        print("  FAIL: no message received within 60s")
        return False
    except Exception as e:
        print(f"  FAIL: connection error — {e}")
        return False

    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        print(f"  FAIL: received non-JSON message: {message!r}")
        return False

    print(f"  Received: {json.dumps(data, indent=2)}")

    if data.get("type") != "price_update":
        print(f"  FAIL: expected type 'price_update', got {data.get('type')!r}")
        return False

    if "data" not in data:
        print("  FAIL: missing 'data' field")
        return False

    inner = data["data"]
    for field in ("symbol", "price", "last_updated"):
        if field not in inner:
            print(f"  FAIL: missing data.{field}")
            return False

    print("  PASS")
    return True


def main() -> None:
    print("Fetching URLs from Terraform output...")
    try:
        api_url, ws_url = get_urls()
    except Exception as e:
        print(f"Error getting Terraform outputs: {e}")
        sys.exit(1)

    print(f"  API URL: {api_url}")
    print(f"  WS  URL: {ws_url}")
    print()

    results = []
    results.append(test_price_freshness(api_url))
    results.append(asyncio.run(test_websocket(ws_url)))

    print()
    passed = sum(results)
    total = len(results)
    print(f"Results: {passed}/{total} passed")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
