const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080")
  .replace("http://", "ws://")
  .replace("https://", "wss://");

export type CallRole = "caller" | "callee";

export interface CallHandlers {
  onRemoteStream: (stream: MediaStream) => void;
  onStateChange:  (state: RTCPeerConnectionState) => void;
  onError:        (err: Error) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export class SafeScanCall {
  private pc:          RTCPeerConnection;
  private ws:          WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private contactId:   string;
  private handlers:    CallHandlers;

  constructor(
    _slug:      string,
    contactId:  string,
    _role:      CallRole,
    handlers:   CallHandlers
  ) {
    this.contactId = contactId;
    this.handlers  = handlers;

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onconnectionstatechange = () => {
      handlers.onStateChange(this.pc.connectionState);
    };

    this.pc.ontrack = (ev) => {
      if (ev.streams?.[0]) handlers.onRemoteStream(ev.streams[0]);
    };

    this.pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.send({ type: "candidate", to: contactId, candidate: ev.candidate.toJSON() });
      }
    };
  }

  private connectWS(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem("token") ?? "guest";
      const url   = `${WS_BASE}/ws/signal?token=${token}`;
      this.ws     = new WebSocket(url);

      this.ws.onopen  = () => resolve();
      this.ws.onerror = () => reject(new Error("WebSocket connection failed"));

      this.ws.onmessage = async (ev) => {
        try {
          const msg = JSON.parse(ev.data);

          if (msg.type === "offer") {
            await this.pc.setRemoteDescription(new RTCSessionDescription(msg));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            this.send({ ...answer, to: msg.from });

          } else if (msg.type === "answer") {
            await this.pc.setRemoteDescription(new RTCSessionDescription(msg));

          } else if (msg.type === "candidate") {
            await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          }
        } catch (e) {
          this.handlers.onError(e as Error);
        }
      };
    });
  }

  private send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  async startCall(): Promise<MediaStream> {
    const stream = await this.getMedia();
    stream.getTracks().forEach((t) => this.pc.addTrack(t, stream));

    await this.connectWS();

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.send({ ...offer, to: this.contactId });

    return stream;
  }

  async answerCall(): Promise<MediaStream> {
    const stream = await this.getMedia();
    stream.getTracks().forEach((t) => this.pc.addTrack(t, stream));
    await this.connectWS();
    return stream;
  }

  private async getMedia(): Promise<MediaStream> {
    try {
      const stream     = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.localStream = stream;
      return stream;
    } catch {
      throw new Error("Microphone access denied. Please allow microphone to make emergency calls.");
    }
  }

  hangup() {
    this.ws?.close();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.pc.close();
  }

  get state(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }
}