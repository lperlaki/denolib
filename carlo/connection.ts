import { connectWebSocket, WebSocket } from 'https://deno.land/std/ws/mod.ts';

export interface Message {
    id?: number;
    result?: any;
    method?: string;
    error?: any;
    params?: { sessionId: string } | any;
}

export class Connection extends EventTarget {
    endpoint: URL;
    socket: WebSocket;

    private lastId = 0;
    private callbacks = new Map();

    constructor(endpoint: URL) {
        super();
        this.endpoint = endpoint;

        this.addEventListener('message', (event: CustomEvent) => {
            const msg: Message = event.detail;

            if (msg.params && msg.params.message) {
                this.dispatchEvent(
                    new CustomEvent('message', {
                        detail: JSON.parse(msg.params.message),
                    })
                );
            }

            if (msg.error)
                this.dispatchEvent(
                    new CustomEvent('error', {
                        detail: msg.error,
                    })
                );

            if (msg.id && msg.result && this.callbacks.has(msg.id)) {
                const callback = this.callbacks.get(msg.id);
                this.callbacks.delete(msg.id);
                if (msg.error) callback.reject(msg.error);
                else callback.resolve(msg.result);
            }
        });
    }

    async connect() {
        if (this.socket == undefined) {
            this.socket = await connectWebSocket(this.endpoint.toString());
            console.log('Websocket Connected');
            this.listen();
        }
        return this.socket;
    }

    private async _listen() {
        for await (const msg of this.socket.receive()) {
            this.dispatchEvent(
                new CustomEvent('message', {
                    detail: JSON.parse(msg.toString()),
                })
            );
        }
    }

    listen() {
        this._listen();
    }

    rawSend(msg: Object, id = ++this.lastId) {
        this.socket.send(JSON.stringify({ ...msg, id }));
        return id;
    }

    send(method, params = {}, sessionId = undefined): Promise<any> {
        if (sessionId)
            return new Promise((resolve, reject) => {
                const id = ++this.lastId;
                this.rawSend({
                    method: 'Target.sendMessageToTarget',
                    params: {
                        sessionId,
                        message: JSON.stringify({ id, method, params }),
                    },
                });
                this.callbacks.set(id, { resolve, reject, method });
            });
        else
            return new Promise((resolve, reject) => {
                const id = this.rawSend({ method, params });
                this.callbacks.set(id, { resolve, reject, method });
            });
    }
}
