import json
import os
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr

COINS_TABLE_NAME = os.environ.get("COINS_TABLE_NAME", "")
USERS_TABLE_NAME = os.environ.get("USERS_TABLE_NAME", "")

dynamodb = boto3.resource("dynamodb")
coins_table = dynamodb.Table(COINS_TABLE_NAME)
users_table = dynamodb.Table(USERS_TABLE_NAME)

BET_DURATION_SECONDS = 60


def get_coin(symbol):
    resp = coins_table.get_item(Key={"symbol": symbol})
    return resp.get("Item")


def put_coin(item):
    coins_table.put_item(Item=item)


def scan_pending_bets():
    threshold = (datetime.now(timezone.utc) - timedelta(seconds=BET_DURATION_SECONDS)).isoformat()
    items = []
    params = {
        "IndexName": "bet_at-index",
        "FilterExpression": Attr("bet_at").lte(threshold),
    }
    while True:
        resp = users_table.scan(**params)
        items.extend(resp.get("Items", []))
        last_key = resp.get("LastEvaluatedKey")
        if not last_key:
            break
        params["ExclusiveStartKey"] = last_key
    return items


def settle_bet(user_id, score_delta):
    users_table.update_item(
        Key={"user_id": user_id},
        UpdateExpression="REMOVE bet_at, bet_direction, bet_price ADD score :delta",
        ExpressionAttributeValues={
            ":delta": Decimal(str(score_delta)),
        },
    )


def build_and_cache_leaderboard():
    items = []
    params = {"ProjectionExpression": "user_id, score"}
    while True:
        resp = users_table.scan(**params)
        items.extend(resp.get("Items", []))
        last_key = resp.get("LastEvaluatedKey")
        if not last_key:
            break
        params["ExclusiveStartKey"] = last_key

    items.sort(key=lambda x: float(x.get("score", 0)), reverse=True)
    top_20 = [
        {"user_id": item["user_id"], "score": str(item.get("score", 0))}
        for item in items[:20]
    ]

    coins_table.put_item(Item={
        "symbol": "LEADERBOARD",
        "entries": json.dumps(top_20),
        "last_updated": datetime.now(timezone.utc).isoformat(),
    })
