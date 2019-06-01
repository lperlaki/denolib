/**
 * Copyright 2017 Google Inc. All rights reserved.
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

import api from './lib/api.js';
import {
  helper
} from './lib/helper.js';

import {Puppeteer} from './lib/Puppeteer.js'

let asyncawait = true;
try {
  new Function('async function test(){await 1}');
} catch (error) {
  asyncawait = false;
}

if (asyncawait) {
  for (const className in api) {
    // Puppeteer-web excludes certain classes from bundle, e.g. BrowserFetcher.
    if (typeof api[className] === 'function')
      helper.installAsyncStackHooks(api[className]);
  }
}

const preferredRevision = "662092"
const isPuppeteerCore = true;

const puppeteer = new Puppeteer(__dirname, preferredRevision, isPuppeteerCore);

export default puppeteer