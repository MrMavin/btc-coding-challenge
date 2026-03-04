export interface PriceUpdate {
  symbol: string;
  price: number;
  last_updated: string;
}

export interface BetSettlement {
  delta: number;
}

type PriceHandler = (data: PriceUpdate) => void;
type SettlementHandler = (data: BetSettlement) => void;

const INITIAL_DELAY = 3000;
const MAX_DELAY = 30000;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers = new Set<PriceHandler>();
  private settlementHandlers = new Set<SettlementHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private reconnectDelay = INITIAL_DELAY;
  private pendingUserId: string | null = null;

  constructor(url: string) {
    this.url = url;
    if (url) this.connect();
  }

  private connect() {
    if (this.disposed || !this.url) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectDelay = INITIAL_DELAY;
        if (this.pendingUserId) {
          this.sendRegister(this.pendingUserId);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "price_update" && msg.data) {
            this.handlers.forEach((h) => h(msg.data));
          } else if (msg.type === "bet_settled" && msg.data) {
            this.settlementHandlers.forEach((h) => h(msg.data));
          }
        } catch {
          // ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        if (!this.disposed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // onclose fires after onerror, which handles reconnect
        this.ws?.close();
      };
    } catch {
      if (!this.disposed) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_DELAY);
  }

  private sendRegister(userId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "register", user_id: userId }));
    }
  }

  registerUser(userId: string) {
    this.pendingUserId = userId;
    this.sendRegister(userId);
  }

  subscribe(handler: PriceHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  subscribeSettlement(handler: SettlementHandler): () => void {
    this.settlementHandlers.add(handler);
    return () => this.settlementHandlers.delete(handler);
  }

  disconnect() {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.handlers.clear();
    this.settlementHandlers.clear();
  }
}
