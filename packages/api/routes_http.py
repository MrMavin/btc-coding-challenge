import json
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from dynamo import (
    get_coin,
    get_user,
    put_user,
    delete_user,
    update_user_bet,
)

logger = logging.getLogger()

OVERLAP_BUFFER_SECONDS = 10


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(body, default=str),
    }


def handle_http(event, request_context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    path = event.get("rawPath", "")

    if method == "OPTIONS":
        return _response(200, {})

    try:
        if method == "GET" and path == "/price":
            return _get_price()
        if method == "GET" and path == "/user":
            return _get_user(event)
        if method == "POST" and path == "/user":
            return _create_user(event)
        if method == "POST" and path == "/bet":
            return _place_bet(event)
        if method == "POST" and path == "/user/rename":
            return _rename_user(event)
        if method == "GET" and path == "/leaderboard":
            return _get_leaderboard()

        return _response(404, {"error": "Not found"})
    except Exception:
        logger.exception("Unhandled error")
        return _response(500, {"error": "Internal server error"})


def _parse_body(event):
    body = event.get("body", "")
    if not body:
        return {}
    return json.loads(body)


def _get_price():
    coin = get_coin("BTC")
    if not coin:
        return _response(404, {"error": "Price not available"})

    return _response(200, {
        "symbol": coin["symbol"],
        "price": coin["price"],
        "last_updated": coin.get("last_updated"),
        "chart": json.loads(coin.get("chart", "[]")),
    })


def _get_user(event):
    params = event.get("queryStringParameters") or {}
    user_id = params.get("user_id")
    if not user_id:
        return _response(400, {"error": "user_id is required"})

    user = get_user(user_id)
    if not user:
        return _response(404, {"error": "User not found"})

    result = {
        "user_id": user["user_id"],
        "score": user.get("score", 0),
    }
    if "bet_at" in user:
        result["bet"] = {
            "direction": user.get("bet_direction"),
            "price": user.get("bet_price"),
            "bet_at": user.get("bet_at"),
        }

    return _response(200, result)


def _create_user(event):
    body = _parse_body(event)
    user_id = body.get("user_id", "").strip()
    if not user_id:
        return _response(400, {"error": "user_id is required"})

    existing = get_user(user_id)
    if existing:
        result = {
            "user_id": existing["user_id"],
            "score": existing.get("score", 0),
        }
        if "bet_at" in existing:
            result["bet"] = {
                "direction": existing.get("bet_direction"),
                "price": existing.get("bet_price"),
                "bet_at": existing.get("bet_at"),
            }
        return _response(200, result)

    put_user({"user_id": user_id, "score": Decimal("0")})
    return _response(201, {"user_id": user_id, "score": 0})


def _place_bet(event):
    body = _parse_body(event)
    user_id = body.get("user_id", "").strip()
    direction = body.get("direction", "").strip().lower()

    if not user_id:
        return _response(400, {"error": "user_id is required"})
    if direction not in ("up", "down"):
        return _response(400, {"error": "direction must be 'up' or 'down'"})

    user = get_user(user_id)
    if not user:
        return _response(404, {"error": "User not found"})

    coin = get_coin("BTC")
    if not coin:
        return _response(503, {"error": "Price not available"})

    current_price = float(coin["price"])
    last_updated_str = coin.get("last_updated", "")

    now = datetime.now(timezone.utc)

    if last_updated_str:
        last_updated = datetime.fromisoformat(last_updated_str)
        seconds_since = (now - last_updated).total_seconds()
        if seconds_since < OVERLAP_BUFFER_SECONDS:
            bet_at = (last_updated + timedelta(seconds=OVERLAP_BUFFER_SECONDS)).isoformat()
        else:
            bet_at = now.isoformat()
    else:
        bet_at = now.isoformat()

    try:
        update_user_bet(user_id, direction, current_price, bet_at)
    except Exception as e:
        if "ConditionalCheckFailedException" in str(type(e).__name__):
            return _response(409, {"error": "Active bet already exists"})
        raise

    return _response(200, {
        "user_id": user_id,
        "bet": {
            "direction": direction,
            "price": str(current_price),
            "bet_at": bet_at,
        },
    })


def _rename_user(event):
    body = _parse_body(event)
    old_user_id = body.get("old_user_id", "").strip()
    new_user_id = body.get("new_user_id", "").strip()

    if not old_user_id or not new_user_id:
        return _response(400, {"error": "old_user_id and new_user_id are required"})

    old_user = get_user(old_user_id)
    if not old_user:
        return _response(404, {"error": "User not found"})

    if "bet_at" in old_user:
        return _response(409, {"error": "Cannot rename while bet is active"})

    if get_user(new_user_id):
        return _response(409, {"error": "New user_id already taken"})

    put_user({"user_id": new_user_id, "score": old_user.get("score", Decimal("0"))})
    delete_user(old_user_id)

    return _response(200, {"user_id": new_user_id, "score": old_user.get("score", 0)})


def _get_leaderboard():
    cached = get_coin("LEADERBOARD")
    if not cached:
        return _response(200, {"leaderboard": []})

    entries = json.loads(cached.get("entries", "[]"))
    return _response(200, {
        "leaderboard": entries,
        "last_updated": cached.get("last_updated"),
    })
