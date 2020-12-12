/// <reference lib="esNext" />
/// <reference lib="dom" />
/// <reference lib="webworker.importScripts" />
/// <reference lib="ScriptHost" />
/// <reference lib="dom.iterable" />
/// <reference no-default-lib="true"/>

import * as RTCMan from "./WebRTCManager.ts";

const sendButton: HTMLButtonElement = <HTMLButtonElement> document.getElementById("sendPeer");
const messageInputBox: HTMLInputElement = <HTMLInputElement> document.getElementById("message");
const receiveBox: HTMLDivElement = <HTMLDivElement> document.getElementById("receivebox");
const connectButton: HTMLButtonElement = <HTMLButtonElement> document.getElementById("connectButton");
const connectInputBox: HTMLInputElement = <HTMLInputElement> document.getElementById("connect");

const wsClient = new RTCMan.WEBSOCKET_SIGNAL_CLIENT(`ws://${window.location.host}/rtcSignals`)

wsClient.setUUIDUpdate((uuid: string) => {
    var el = <HTMLParagraphElement> document.createElement("p");
    var txtNode = <Text> document.createTextNode(`Your UUID is: ${uuid}`);

    el.appendChild(txtNode);
    receiveBox.appendChild(el);
})

const rtcMan = new RTCMan.RTC_MANAGER<RTCMan.WEBSOCKET_SIGNAL_CLIENT>(wsClient);
rtcMan.setOnNewConnect((uuid: string, pc: RTCPeerConnection) => {
    var el = <HTMLParagraphElement> document.createElement("p");
    var txtNode = <Text> document.createTextNode(`New Peer: ${uuid}`);

    el.appendChild(txtNode);
    receiveBox.appendChild(el);
    sendButton.disabled = false;

    pc.ondatachannel = (ev: RTCDataChannelEvent) => {
        dc = ev.channel;
        setupDC();
    }
    setupDC();
});

connectButton.addEventListener("click", connectPeer, false);

let dc: RTCDataChannel | undefined;

const setupDC = () => {
    if(!dc)
        return;
    // ELSE
    dc.onmessage = receiveMessage;
    dc.onopen = stateChange;
    dc.onclose = stateChange;
}
const message = (message: string) => {
    const el = <HTMLParagraphElement> document.createElement("p");
    const txtNode = <Text> document.createTextNode(message);
    el.appendChild(txtNode);
    receiveBox.appendChild(el);
} 

const stateChange = (ev: Event) => {
    let state: RTCDataChannelState;
    if (dc) {
        state = dc.readyState;
        if (state === "open") {
            messageInputBox.focus();
            sendButton.disabled = false;
            message("connected");
        } else {
            sendButton.disabled = true;
            message("lost connection");
        }
    }
};

const receiveMessage = (ev: MessageEvent) => {
  var el = <HTMLParagraphElement> document.createElement("p");
  var txtNode = <Text> document.createTextNode(`Peer Data: ${ev.data}`);

  el.appendChild(txtNode);
  receiveBox.appendChild(el);
};

function connectPeer() {
    const uuid = connectInputBox.value;
    const pc = rtcMan.connect(uuid, 1);
    dc = pc.createDataChannel("test1");
    pc.ondatachannel = (ev: RTCDataChannelEvent) => {
        dc = ev.channel;
    };
    setupDC();
    sendButton.disabled = false;
}

function sendMessage() {
  var msg = messageInputBox.value;
  if(dc?.readyState == "open"){
      dc.send(msg);
      message(`Sending: ${msg}`)
  }
}

sendButton.addEventListener("click", sendMessage, false);

export {};