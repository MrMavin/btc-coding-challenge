import json
import logging
import time
from datetime import datetime, timezone

from coinstats import fetch_current_price, fetch_chart_24h
from dynamo import get_coin, put_coin, scan_pending_bets, settle_bet, build_and_cache_leaderboard
from websocket import broadcast_price_update

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TWENTY_FOUR_HOURS = 24 * 60 * 60


def compute_score_delta(direction, bet_price, current_price):
    if current_price > bet_price:
        return 1 if direction == "up" else -1
    elif current_price < bet_price:
        return 1 if direction == "down" else -1
    else:
        return 0


def evaluate_ready_bets(current_price):
    pending = scan_pending_bets()
    if not pending:
        logger.info("No pending bets to evaluate")
        return

    logger.info(f"Evaluating {len(pending)} pending bet(s)")
    for user in pending:
        user_id = user["user_id"]
        direction = user.get("bet_direction")
        bet_price = float(user.get("bet_price", 0))

        delta = compute_score_delta(direction, bet_price, current_price)
        settle_bet(user_id, delta)
        logger.info(f"Settled bet for user={user_id} direction={direction} bet_price={bet_price} current={current_price} delta={delta}")


def handler(event, context):
    logger.info("Price updater invoked")

    price_data = fetch_current_price()
    current_price = price_data["price"]
    now = datetime.now(timezone.utc)
    timestamp = int(now.timestamp())

    symbol = "BTC"

    existing = get_coin(symbol)
    raw_chart = existing.get("chart", "[]") if existing else "[]"
    chart = json.loads(raw_chart) if isinstance(raw_chart, str) else raw_chart

    if not chart:
        logger.info("No chart data found, fetching 24h historical chart")
        chart = fetch_chart_24h()
    else:
        chart.append([timestamp, current_price])

    cutoff = timestamp - TWENTY_FOUR_HOURS
    chart = [point for point in chart if point[0] >= cutoff]

    last_updated = now.isoformat()

    put_coin({
        "symbol": symbol,
        "price": str(current_price),
        "last_updated": last_updated,
        "chart": json.dumps(chart),
    })
    logger.info(f"Updated {symbol} price: {current_price}")

    broadcast_price_update({
        "symbol": symbol,
        "price": current_price,
        "last_updated": last_updated,
    })

    evaluate_ready_bets(current_price)

    build_and_cache_leaderboard()
    logger.info("Leaderboard cache updated")
