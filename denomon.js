#!/usr/bin/env deno -A

import watch from './watch.ts';

const {
    run,
    args
} = Deno;


const log = msg => console.log('\x1b[33m%s\x1b[0m', '[Denomon]', msg)
const runArgs = name => ({
    args: ['deno', '-A', name]
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
