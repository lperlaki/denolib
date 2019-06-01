const waitResult = (time, result) => new Promise(res => setTimeout(res, time, result))
const wait = time => waitResult(time, undefined)

Promise.resolve(5).then(n => waitResult(1000, n * 10)).then(console.log)