/// <reference lib="esNext" />
/// <reference lib="dom" />
/// <reference lib="webworker.importScripts" />
/// <reference lib="ScriptHost" />
/// <reference lib="dom.iterable" />
/// <reference no-default-lib="true"/>
export interface signalMessage {
  descriptor?: RTCSessionDescription;
  candidate?: RTCIceCandidate;
  polite?: number;
}
export abstract class SIGNAL_CLIENT {
  public uuid?: string;
  public abstract setUUIDUpdate(receiver: (uuid: string) => void): void;
  public abstract setReceiver(
    receiver: (uuid: string, message: signalMessage) => void,
  ): void;
  public abstract send(uuid: string, message: signalMessage): void;
}
export class WEBSOCKET_SIGNAL_CLIENT extends SIGNAL_CLIENT {
  private socket: WebSocket;
  private receiver: (uuid: string, message: signalMessage) => void = () => {};
  public uuid?: string;
  private uuidUpdate: (uuid: string) => void = () => {};
  constructor(server: string) {
    super();
    this.socket = new WebSocket(server);
    this.socket.onmessage = (event: MessageEvent) => {
      this.receiverWrapper(event);
    };
  }
  send(uuid: string, message: signalMessage) {
    this.socket.send(JSON.stringify({ uuid, message }));
  }
  private receiverWrapper(event: MessageEvent) {
    const msg = JSON.parse(event.data);
    const uuid = msg.uuid;
    const sigMsg = msg.message;
    if (typeof uuid == "string" && sigMsg) {
      this.receiver(uuid, sigMsg);
    } else if (typeof uuid == "string" && !sigMsg) {
      this.uuid = uuid;
      this.uuidUpdate(uuid);
    }
  }
  public setReceiver(receiver: (uuid: string, message: signalMessage) => void) {
    this.receiver = receiver;
  }
  public setUUIDUpdate(update: (uuid: string) => void) {
    this.uuidUpdate = update;
  }
}