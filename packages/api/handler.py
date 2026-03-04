import json
import logging

from routes_http import handle_http
from routes_ws import handle_ws

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    request_context = event.get("requestContext", {})

    if "connectionId" in request_context:
        return handle_ws(event, request_context)

    return handle_http(event, request_context)
