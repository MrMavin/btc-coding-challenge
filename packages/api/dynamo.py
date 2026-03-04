import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr

COINS_TABLE_NAME = os.environ.get("COINS_TABLE_NAME", "")
USERS_TABLE_NAME = os.environ.get("USERS_TABLE_NAME", "")
CONNECTIONS_TABLE_NAME = os.environ.get("CONNECTIONS_TABLE_NAME", "")

dynamodb = boto3.resource("dynamodb")
coins_table = dynamodb.Table(COINS_TABLE_NAME)
users_table = dynamodb.Table(USERS_TABLE_NAME)
connections_table = dynamodb.Table(CONNECTIONS_TABLE_NAME)


def get_coin(symbol):
    resp = coins_table.get_item(Key={"symbol": symbol})
    return resp.get("Item")


def get_user(user_id):
    resp = users_table.get_item(Key={"user_id": user_id})
    return resp.get("Item")


def put_user(item):
    users_table.put_item(Item=item)


def delete_user(user_id):
    users_table.delete_item(Key={"user_id": user_id})


def update_user_bet(user_id, direction, price, bet_at):
    users_table.update_item(
        Key={"user_id": user_id},
        UpdateExpression="SET bet_at = :bat, bet_direction = :dir, bet_price = :price",
        ConditionExpression=Attr("bet_at").not_exists(),
        ExpressionAttributeValues={
            ":bat": bet_at,
            ":dir": direction,
            ":price": str(price),
        },
    )


def put_connection(connection_id):
    connections_table.put_item(Item={"connection_id": connection_id})


def delete_connection(connection_id):
    connections_table.delete_item(Key={"connection_id": connection_id})
