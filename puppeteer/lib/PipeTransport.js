/**
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//TODO: Buffer
import {
  helper
} from './helper.js';

/**
 * @implements {!Puppeteer.ConnectionTransport}
 */
class PipeTransport {
  /**
   * @param {!NodeJS.WritableStream} pipeWrite
   * @param {!NodeJS.ReadableStream} pipeRead
   */
  constructor(pipeWrite, pipeRead) {
    this._pipeWrite = pipeWrite;
    this._pendingMessage = '';
    this._eventListeners = [
      helper.addEventListener(pipeRead, 'data', buffer => this._dispatch(buffer)),
      helper.addEventListener(pipeRead, 'close', () => {
        if (this.onclose)
          this.onclose.call(null);
      })
    ];
    this.onmessage = null;
    this.onclose = null;
  }

  /**
   * @param {string} message
   */
  send(message) {
    this._pipeWrite.write(message);
    this._pipeWrite.write('\0');
  }

  /**
   * @param {!Buffer} buffer
   */
  _dispatch(buffer) {
    let end = buffer.indexOf('\0');
    if (end === -1) {
      this._pendingMessage += buffer.toString();
      return;
    }
    const message = this._pendingMessage + buffer.toString(undefined, 0, end);
    if (this.onmessage)
      this.onmessage.call(null, message);

    let start = end + 1;
    end = buffer.indexOf('\0', start);
    while (end !== -1) {
      if (this.onmessage)
        this.onmessage.call(null, buffer.toString(undefined, start, end));
      start = end + 1;
      end = buffer.indexOf('\0', start);
    }
    this._pendingMessage = buffer.toString(undefined, start);
  }

  close() {
    this._pipeWrite = null;
    helper.removeEventListeners(this._eventListeners);
  }
}

export default PipeTransport;