import logging

from dynamo import put_connection, delete_connection

logger = logging.getLogger()


def handle_ws(event, request_context):
    route_key = request_context.get("routeKey")
    connection_id = request_context["connectionId"]

    if route_key == "$connect":
        put_connection(connection_id)
        logger.info(f"WebSocket connected: {connection_id}")
        return {"statusCode": 200}

    if route_key == "$disconnect":
        delete_connection(connection_id)
        logger.info(f"WebSocket disconnected: {connection_id}")
        return {"statusCode": 200}

    return {"statusCode": 200}
