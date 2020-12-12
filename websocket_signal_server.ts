import {
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket,
} from "https://deno.land/std@0.77.0/ws/mod.ts";
import { v4 } from "https://deno.land/std@0.77.0/uuid/mod.ts";
import { wsHandler } from "https://raw.githubusercontent.com/jcc10/oak_websoket_middleware/v1.1.1/mod.ts";


export class WEBSOCKET_SIGNAL_SERVER {
  protected users = new Map<string, WebSocket>();
  protected path: string;
  constructor(path: string) {
    this.path = path;
  }

  protected async handler(
    ws: WebSocket,
    url: URL,
    headers: Headers,
    next: () => Promise<void>
  ): Promise<void> {
    if (url.pathname != this.path) {
      await next();
    }

    const userId = v4.generate();

    // Register user connection
    this.users.set(userId, ws);
    ws.send(JSON.stringify({uuid: userId}));
    // Wait for new messages
    try {
      for await (const ev of ws) {
        if (typeof ev === "string") {
          console.log("ws:String", ev);
          try {
            const msg = JSON.parse(ev);
            const p2 = this.users.get(msg.uuid);
            if(p2){
              msg.uuid = userId;
              const out = JSON.stringify(msg);
              p2.send(out);
            }
          } catch {
            //console.log("JSON PARSE ERROR!");
            null;
          }
        } else if (ev instanceof Uint8Array) {
          // binary message
          //console.log("ws:Binary", ev);
        } else if (isWebSocketPingEvent(ev)) {
          const [, body] = ev;
          // ping
          //console.log("ws:Ping", body);
        } else if (isWebSocketCloseEvent(ev)) {
          // close
          const { code, reason } = ev;
          //console.log("ws:Close", code, reason);
        }
      }
    } catch (err) {
      console.error(`failed to receive frame: ${err}`);

      if (!ws.isClosed) {
        await ws.close(1000).catch(console.error);
      }
    }
    return;
  }

  public socket_handler(): wsHandler {
    return async (socket: WebSocket, url: URL, headers: Headers, next?: ()=>Promise<void>) => {
      if(!next){
        next = () => {return Promise.resolve();};
      }
      await this.handler(socket, url, headers, next);
    };
  }

  protected async broadcast(message: string, senderId?: string): Promise<void> {
    if (!message) return;
    const fullM = senderId ? `[${senderId}]: ${message}` : message;
    console.log(fullM);
    for (const user of this.users.values()) {
      if (user.isClosed) {
        continue;
      }
      await user.send(fullM);
    }
  }
}