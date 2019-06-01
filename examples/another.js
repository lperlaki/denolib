import EventEmitter from '../events.js'

const ee = new EventEmitter()

ee.on('test', console.log)
ee.once('test', console.log)

ee.emit('test', 'first')
ee.emit('test', 'second')
