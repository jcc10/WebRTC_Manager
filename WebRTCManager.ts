/// <reference lib="esNext" />
/// <reference lib="dom" />
/// <reference lib="webworker.importScripts" />
/// <reference lib="ScriptHost" />
/// <reference lib="dom.iterable" />
/// <reference no-default-lib="true"/>
import { signalMessage, SIGNAL_CLIENT } from "./Signals.ts";

export class RTC_MANAGER<T extends SIGNAL_CLIENT> {
    public peerMap: Map<string, RTCPeerConnection> = new Map<string, RTCPeerConnection>();
    private onMessageMap: Map<string, (message:signalMessage)=>void> = new Map<string, (message:signalMessage)=>void>();
    private politeMap: Map<string, boolean> = new Map<string, boolean>();
    private onNewConnect: (uuid: string, pc: RTCPeerConnection) => void = () => {};
    public signalClient: T;
    constructor(signalClient: T){
        this.signalClient = signalClient;
        this.signalClient.setReceiver((uuid: string, message: signalMessage) => {
            this.signalReceiver(uuid, message);
        })
    }

    private signalReceiver(uuid: string, message: signalMessage): void {
        let om = this.onMessageMap.get(uuid);
        if(!om){
            om = this.new_connect(uuid);
        }
        om(message);
    }

    public setOnNewConnect(listener: (uuid: string, pc: RTCPeerConnection)=>void):void{
        this.onNewConnect = listener;
    }

    private new_connect(uuid: string): (message:signalMessage)=>void {
        const pc = <RTCPeerConnection>new RTCPeerConnection();

        // - The perfect negotiation logic, separated from the rest of the application ---

        // keep track of some negotiation state to prevent races and errors
        let makingOffer = false;
        let ignoreOffer = false;
        let isSettingRemoteAnswerPending = false;

        // send any ice candidates to the other peer
        pc.onicecandidate = ({ candidate }) => {
            if(candidate)
            this.signalClient.send(uuid, { candidate })
        };

        // let the "negotiationneeded" event trigger offer generation
        pc.onnegotiationneeded = async () => {
        try {
            makingOffer = true;
            // @ts-ignore TS Bug #41939
            await pc.setLocalDescription();
            if(pc.localDescription)
            this.signalClient.send(uuid, { descriptor: pc.localDescription });
        } catch (err) {
            console.error(err);
        } finally {
            makingOffer = false;
        }
        };

        const om = async (message: signalMessage) => {
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
                // An offer may come in while we are busy processing SRD(answer).
                // In this case, we will be in "stable" by the time the offer is processed
                // so it is safe to chain it on our Operations Chain now.
                const readyForOffer = !makingOffer &&
                    (pc.signalingState == "stable" || isSettingRemoteAnswerPending);
                const offerCollision = description.type == "offer" && !readyForOffer;

                ignoreOffer = !this.politeMap.get(uuid) && offerCollision;
                if (ignoreOffer) {
                    return;
                }
                isSettingRemoteAnswerPending = description.type == "answer";
                await pc.setRemoteDescription(description); // SRD rolls back as needed
                isSettingRemoteAnswerPending = false;
                if (description.type == "offer") {
                    // @ts-ignore TS Bug #41939
                    await pc.setLocalDescription();
                    if (pc.localDescription) {
                    this.signalClient.send(uuid, { descriptor: pc.localDescription });
                    }
                }
                } else if (candidate) {
                try {
                    await pc.addIceCandidate(candidate);
                } catch (err) {
                    if (!ignoreOffer) throw err; // Suppress ignored offer's candidates
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

    public connect(uuid: string, politeTriplet?: number): RTCPeerConnection {
        const pc = <RTCPeerConnection>new RTCPeerConnection();
        if (politeTriplet) {
            if (politeTriplet == 1) {
                this.politeMap.set(uuid, true);
            } else {
                this.politeMap.set(uuid, false);
            }
        }

        // - The perfect negotiation logic, separated from the rest of the application ---

        // keep track of some negotiation state to prevent races and errors
        let makingOffer = false;
        let ignoreOffer = false;
        let isSettingRemoteAnswerPending = false;

        // send any ice candidates to the other peer
        pc.onicecandidate = ({ candidate }) => {
            if(candidate)
            this.signalClient.send(uuid, { candidate })
        };

        // let the "negotiationneeded" event trigger offer generation
        pc.onnegotiationneeded = async () => {
        try {
            makingOffer = true;
            // @ts-ignore TS Bug #41939
            await pc.setLocalDescription();
            if(pc.localDescription)
            this.signalClient.send(uuid, { descriptor: pc.localDescription });
        } catch (err) {
            console.error(err);
        } finally {
            makingOffer = false;
        }
        };

        this.onMessageMap.set(uuid, async (message: signalMessage) => {
            const politeTriplet = message.polite;
            const description = message.descriptor;
            const candidate = message.candidate;
            try {
                if(politeTriplet){
                    if(politeTriplet == 1){
                        this.politeMap.set(uuid, true);
                    } else if(politeTriplet == -1){
                        this.politeMap.set(uuid, false);
                    }
                }
                if (description) {
                // An offer may come in while we are busy processing SRD(answer).
                // In this case, we will be in "stable" by the time the offer is processed
                // so it is safe to chain it on our Operations Chain now.
                const readyForOffer = !makingOffer &&
                    (pc.signalingState == "stable" || isSettingRemoteAnswerPending);
                const offerCollision = description.type == "offer" && !readyForOffer;

                ignoreOffer = !this.politeMap.get(uuid) && offerCollision;
                if (ignoreOffer) {
                    return;
                }
                isSettingRemoteAnswerPending = description.type == "answer";
                await pc.setRemoteDescription(description); // SRD rolls back as needed
                isSettingRemoteAnswerPending = false;
                if (description.type == "offer") {
                    // @ts-ignore TS Bug #41939
                    await pc.setLocalDescription();
                    if(pc.localDescription)
                    this.signalClient.send(uuid, { descriptor: pc.localDescription });
                }
                } else if (candidate) {
                try {
                    await pc.addIceCandidate(candidate);
                } catch (err) {
                    if (!ignoreOffer) throw err; // Suppress ignored offer's candidates
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