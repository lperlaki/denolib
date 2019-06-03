#!/usr/bin/env deno run -A

import {
    yellow
} from "https://deno.land/std/colors/mod.ts";
import watch from './watch.ts';

const {
    run,
    args
} = Deno;


const log = msg => console.log(yellow('[Denomon]'), msg)
const runArgs = name => ({
    args: ['deno', 'run', '-A', name]
});

async function main() {
    const [_, ...entry_points] = args
    const processes = {}
    for (const entry of entry_points) {
        log(`Starting ${entry}`)
        processes[entry] = run(runArgs(entry))
    }

    for await (const changes of watch(entry_points)) {
        for (const change of changes.all) {
            log(`${change} changed`)
            processes[change].close()
            processes[change] = run(runArgs(change))
        }
    }
}
main()