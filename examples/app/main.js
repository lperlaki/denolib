import {
    red
} from "https://deno.land/std/colors/mod.ts";


import Chrome from '../../carlo/chrome.ts'



async function main() {

    try {
        const chrome = new Chrome();

        await chrome.launch();

        chrome.addEventListener('console.log', event => console.log(red('[REMOTE]'), ...event.detail))
        chrome.addEventListener('Page.domContentEventFired', event => console.log('Page dc', event.detail));
        chrome.addEventListener('Page.loadEventFired', event => console.log('Page lef', event.detail));


        await chrome.init()

        await chrome.evaluate(_ => console.log('asdf'))
        console.log('end')



    } catch (error) {
        console.error(error)
    }
}


main()