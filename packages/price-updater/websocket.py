import json
import logging
import os

import boto3

logger = logging.getLogger()

CONNECTIONS_TABLE_NAME = os.environ.get("CONNECTIONS_TABLE_NAME", "")
WEBSOCKET_API_ENDPOINT = os.environ.get("WEBSOCKET_API_ENDPOINT", "")

dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table(CONNECTIONS_TABLE_NAME)


def _get_management_client():
    endpoint = WEBSOCKET_API_ENDPOINT.replace("wss://", "https://")
    return boto3.client("apigatewaymanagementapi", endpoint_url=endpoint)


def broadcast_price_update(price_data):
    if not CONNECTIONS_TABLE_NAME or not WEBSOCKET_API_ENDPOINT:
        logger.warning("WebSocket not configured, skipping broadcast")
        return

    resp = connections_table.scan(ProjectionExpression="connection_id")
    connections = resp.get("Items", [])

    if not connections:
        logger.info("No WebSocket connections to broadcast to")
        return

    client = _get_management_client()
    message = json.dumps({"type": "price_update", "data": price_data})
    stale = []

    for conn in connections:
        connection_id = conn["connection_id"]
        try:
            client.post_to_connection(
                ConnectionId=connection_id, Data=message.encode()
            )
        except client.exceptions.GoneException:
            stale.append(connection_id)
        except Exception:
            logger.exception(f"Failed to post to connection {connection_id}")
            stale.append(connection_id)

    for connection_id in stale:
        try:
            connections_table.delete_item(Key={"connection_id": connection_id})
            logger.info(f"Removed stale connection: {connection_id}")
        except Exception:
            logger.exception(f"Failed to delete stale connection {connection_id}")
