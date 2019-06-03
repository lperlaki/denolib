import { Connection, Message } from './connection.ts';

const CHROME_PATH =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function waitForWsAddres(process: Deno.Process) {
    for await (const chunk of Deno.toAsyncIterator(process.stderr)) {
        const line = new TextDecoder('utf-8').decode(chunk);
        const match = line.match(/DevTools listening on (ws:\/\/.*)/);
        if (match) return new URL(match[1]);
    }
}

export class Chrome extends EventTarget {
    private process: Deno.Process;
    connection: Connection;
    sessionId: string;

    constructor() {
        super();
    }

    waitForEvent(type): Promise<any> {
        return new Promise(resolve => {
            const listener = event => {
                this.removeEventListener(type, listener);
                resolve(event.detail);
            };
            this.addEventListener(type, listener);
        });
    }

    listen() {
        this.connection.addEventListener('message', (event: CustomEvent) => {
            const msg: Message = event.detail;
            this.dispatchEvent(
                new CustomEvent(msg.method, { detail: msg.params })
            );
        });

        this.addEventListener(
            'Runtime.consoleAPICalled',
            ({ detail }: CustomEvent) => {
                this.dispatchEvent(
                    new CustomEvent(`console.${detail.type}`, {
                        detail: detail.args.map(x => x.value),
                    })
                );
            }
        );
    }

    async launch() {
        const targetPage = '<div>Test</div>';
        const args = [
            '--remote-debugging-port=0',
            `--app=data:text/html,${targetPage}`,
            // '--app-mode-oem-manifest=./manifest.json',
            // '--app-mode-auth-code',
            `--enable-features=NetworkService,NetworkServiceInProcess`,
        ];
        this.process = Deno.run({
            args: [CHROME_PATH, ...args],
            stdin: 'piped',
            stdout: 'piped',
            stderr: 'piped',
        });

        console.log('Chrome Started');
        this.connection = new Connection(await waitForWsAddres(this.process));
        await this.connection.connect();
        this.listen();
    }

    async send(method, params = {}) {
        return await this.connection.send(method, params, this.sessionId);
    }

    async init() {
        await this.connection.send('Target.setDiscoverTargets', {
            discover: true,
        });

        const {
            targetInfo: { targetId },
        } = await this.waitForEvent('Target.targetCreated');
        const { sessionId } = await this.connection.send(
            'Target.attachToTarget',
            {
                targetId,
            }
        );

        this.sessionId = sessionId;

        await this.send('Page.enable', {});
        await this.send('Target.setAutoAttach', {
            autoAttach: true,
            waitForDebuggerOnStart: false,
        });
        await this.send('Network.enable', {});
        await this.send('Runtime.enable', {});
        await this.send('Security.enable', {});
        await this.send('Performance.enable', {});
        await this.send('Log.enable', {});
        await this.send('DOM.enable', {});

        return this.sessionId;
    }

    async evaluate(func: Function) {
        const { result } = await this.send('Runtime.evaluate', {
            expression: `(${func})()`,
        });
        return await resolveRemoteObject(result, this);
    }

    async addBinding(name, handler) {
        await this.send('Runtime.addBinding', { name });
        this.addEventListener('Runtime.bindingCalled', (event: CustomEvent) => {
            handler(event.detail.payload);
        });
    }
}

export default Chrome;

async function resolveRemoteObject(remObj, chrome) {
    switch (remObj.type) {
        case 'string':
        case 'number':
        case 'boolean':
            return remObj.value;
        case 'function':
            return new Function(remObj.value);
        case 'object':
            return await wrap(remObj, chrome);
        case 'undefined':
        default:
            return undefined;
    }
}

async function wrap(remoteObject, chrome: Chrome) {
    // TODO: funcition call  Runtime.callFunctionOn

    // TODO: get Dom Node   DOM.requestNode

    const { result } = await chrome.send('Runtime.getProperties', {
        objectId: remoteObject.objectId,
    });

    const target = new Map(result.map(prop => [prop.name, prop]));
    const handler = {
        ownKeys(target) {
            return target.keys();
        },
        getOwnPropertyDescriptor(target, key) {
            return target.get(key);
        },
        getPrototypeOf(target) {
            return { name: remoteObject.description };
        },
        has(target, key) {
            return target.has(key);
        },
        get(target, key) {
            if (target.has(key))
                return resolveRemoteObject(target.get(key).value, chrome);
        },
    };
    return new Proxy(target, handler);
}
