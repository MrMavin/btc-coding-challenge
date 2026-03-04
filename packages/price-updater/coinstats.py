import json
import logging
import os
import urllib.request

logger = logging.getLogger()

API_KEY = os.environ.get("COINSTATS_API_KEY", "")
BASE_URL = "https://openapiv1.coinstats.app"


def _make_request(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url)
    req.add_header("accept", "application/json")
    req.add_header("X-API-KEY", API_KEY)
    req.add_header("User-Agent", "btc-coding-challenge/1.0")

    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


def fetch_current_price():
    data = _make_request("/coins/bitcoin?currency=USD")
    return {"price": data["price"]}


def fetch_chart_24h():
    data = _make_request("/coins/charts?period=24h&coinIds=bitcoin")
    for entry in data:
        if entry.get("coinId") == "bitcoin":
            return [[int(point[0]), float(point[1])] for point in entry.get("chart", [])]
    return []
