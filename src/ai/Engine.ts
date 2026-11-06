export class Engine {
  private worker: Worker;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (reason?: unknown) => void;
  private destroyed = false;
  private pendingRejects = new Set<(reason: Error) => void>();

  constructor() {
    const wasmSupported =
      typeof WebAssembly === 'object' &&
      WebAssembly.validate(new Uint8Array([0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));

    const base = import.meta.env.BASE_URL;
    this.worker = new Worker(`${base}${wasmSupported ? 'stockfish.wasm.js' : 'stockfish.js'}`);
    this.worker.addEventListener('message', (e) => this.onMessage(e));
    this.worker.addEventListener('error', () => {
      this.readyReject?.(new Error('Failed to load chess engine'));
    });

    this.readyPromise = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    this.worker.postMessage('uci');
  }

  private onMessage(e: MessageEvent) {
    const msg = e.data as string;

    if (msg === 'uciok') {
      this.worker.postMessage('isready');
      return;
    }

    if (msg === 'readyok') {
      this.readyResolve();
    }
  }

  async getBestMove(fen: string, movetimeMs = 500): Promise<string> {
    if (this.destroyed) throw new Error('Engine destroyed');
    await this.readyPromise;
    if (this.destroyed) throw new Error('Engine destroyed');

    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go movetime ${movetimeMs}`);

    const worker = this.worker;
    const pendingRejects = this.pendingRejects;

    return new Promise((resolve, reject) => {
      function cleanup() {
        worker.removeEventListener('message', handler);
        pendingRejects.delete(rejectPending);
      }

      function rejectPending(err: Error) {
        cleanup();
        reject(err);
      }

      function handler(e: MessageEvent) {
        const msg = e.data as string;
        const match = msg.match(/^bestmove\s+(\S+)/);
        if (match) {
          cleanup();
          resolve(match[1]);
        }
      }

      pendingRejects.add(rejectPending);
      worker.addEventListener('message', handler);
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.worker.terminate();
    for (const reject of this.pendingRejects) {
      reject(new Error('Engine destroyed'));
    }
    this.pendingRejects.clear();
  }
}
