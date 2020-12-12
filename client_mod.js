export class SIGNAL_CLIENT {
}
export class WEBSOCKET_SIGNAL_CLIENT extends SIGNAL_CLIENT {
    receiver = ()=>{
    };
    uuidUpdate = ()=>{
    };
    constructor(server){
        super();
        this.socket = new WebSocket(server);
        this.socket.onmessage = (event)=>{
            this.receiverWrapper(event);
        };
    }
    send(uuid, message) {
        this.socket.send(JSON.stringify({
            uuid,
            message
        }));
    }
    receiverWrapper(event) {
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
    setReceiver(receiver) {
        this.receiver = receiver;
    }
    setUUIDUpdate(update) {
        this.uuidUpdate = update;
    }
}
export class RTC_MANAGER {
    peerMap = new Map();
    onMessageMap = new Map();
    politeMap = new Map();
    onNewConnect = ()=>{
    };
    constructor(signalClient){
        this.signalClient = signalClient;
        this.signalClient.setReceiver((uuid, message)=>{
            this.signalReceiver(uuid, message);
        });
    }
    signalReceiver(uuid, message) {
        let om = this.onMessageMap.get(uuid);
        if (!om) {
            om = this.new_connect(uuid);
        }
        om(message);
    }
    setOnNewConnect(listener) {
        this.onNewConnect = listener;
    }
    new_connect(uuid) {
        const pc = new RTCPeerConnection();
        let makingOffer = false;
        let ignoreOffer = false;
        let isSettingRemoteAnswerPending = false;
        pc.onicecandidate = ({ candidate  })=>{
            if (candidate) this.signalClient.send(uuid, {
                candidate
            });
        };
        pc.onnegotiationneeded = async ()=>{
            try {
                makingOffer = true;
                await pc.setLocalDescription();
                if (pc.localDescription) this.signalClient.send(uuid, {
                    descriptor: pc.localDescription
                });
            } catch (err) {
                console.error(err);
            } finally{
                makingOffer = false;
            }
        };
        const om = async (message)=>{
            const politeTriplet = message.polite;
            const description = message.descriptor;
            const candidate = message.candidate;
            try {
                if (politeTriplet) {
                    if (politeTriplet == 1) {
                        this.politeMap.set(uuid, true);
                    } else if (politeTriplet == -1) {
                        this.politeMap.set(uuid, false);
                    }
                }
                if (description) {
                    const readyForOffer = !makingOffer && (pc.signalingState == "stable" || isSettingRemoteAnswerPending);
                    const offerCollision = description.type == "offer" && !readyForOffer;
                    ignoreOffer = !this.politeMap.get(uuid) && offerCollision;
                    if (ignoreOffer) {
                        return;
                    }
                    isSettingRemoteAnswerPending = description.type == "answer";
                    await pc.setRemoteDescription(description);
                    isSettingRemoteAnswerPending = false;
                    if (description.type == "offer") {
                        await pc.setLocalDescription();
                        if (pc.localDescription) {
                            this.signalClient.send(uuid, {
                                descriptor: pc.localDescription
                            });
                        }
                    }
                } else if (candidate) {
                    try {
                        await pc.addIceCandidate(candidate);
                    } catch (err) {
                        if (!ignoreOffer) throw err;
                    }
                }
            } catch (err) {
                console.error(err);
            }
        };
        this.onMessageMap.set(uuid, om);
        this.peerMap.set(uuid, pc);
        this.onNewConnect(uuid, pc);
        return om;
    }
    connect(uuid, politeTriplet) {
        const pc = new RTCPeerConnection();
        if (politeTriplet) {
            if (politeTriplet == 1) {
                this.politeMap.set(uuid, true);
            } else {
                this.politeMap.set(uuid, false);
            }
        }
        let makingOffer = false;
        let ignoreOffer = false;
        let isSettingRemoteAnswerPending = false;
        pc.onicecandidate = ({ candidate  })=>{
            if (candidate) this.signalClient.send(uuid, {
                candidate
            });
        };
        pc.onnegotiationneeded = async ()=>{
            try {
                makingOffer = true;
                await pc.setLocalDescription();
                if (pc.localDescription) this.signalClient.send(uuid, {
                    descriptor: pc.localDescription
                });
            } catch (err) {
                console.error(err);
            } finally{
                makingOffer = false;
            }
        };
        this.onMessageMap.set(uuid, async (message)=>{
            const politeTriplet = message.polite;
            const description = message.descriptor;
            const candidate = message.candidate;
            try {
                if (politeTriplet) {
                    if (politeTriplet == 1) {
                        this.politeMap.set(uuid, true);
                    } else if (politeTriplet == -1) {
                        this.politeMap.set(uuid, false);
                    }
                }
                if (description) {
                    const readyForOffer = !makingOffer && (pc.signalingState == "stable" || isSettingRemoteAnswerPending);
                    const offerCollision = description.type == "offer" && !readyForOffer;
                    ignoreOffer = !this.politeMap.get(uuid) && offerCollision;
                    if (ignoreOffer) {
                        return;
                    }
                    isSettingRemoteAnswerPending = description.type == "answer";
                    await pc.setRemoteDescription(description);
                    isSettingRemoteAnswerPending = false;
                    if (description.type == "offer") {
                        await pc.setLocalDescription();
                        if (pc.localDescription) this.signalClient.send(uuid, {
                            descriptor: pc.localDescription
                        });
                    }
                } else if (candidate) {
                    try {
                        await pc.addIceCandidate(candidate);
                    } catch (err) {
                        if (!ignoreOffer) throw err;
                    }
                }
            } catch (err) {
                console.error(err);
            }
        });
        this.peerMap.set(uuid, pc);
        return pc;
    }
}

