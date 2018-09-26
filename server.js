'use strict'

const Hapi = require('hapi')
const Puppeteer = require('./puppeteer.js')
const Yslow = require('./yslow.js')

const server = Hapi.server({
  port: 8080,
  host: 'localhost'
})

server.route({
  method: 'POST',
  path: '/har_and_screenshot',
  handler: async(request, h) => {
    try {
      const data = request.payload
      let har_and_screenshot = await Puppeteer.generateHarAndScreenshot(
        data.url,
        data.proxy,
        data.username,
        data.password
      )
      return (JSON.stringify(har_and_screenshot))
    } catch (err) {
      request.log(['HARANDSCREENSHOTERROR'], err.message)
      return h.response(err.message).code(422)
    }
  }
})

server.route({
  method: 'POST',
  path: '/yslow_report',
  config: {
    payload: {maxBytes: 1000 * 1000 * 25,
      parse: true,
      output: 'file'}
  },
  handler: async (request, h) => {
    try {
      const data = request.payload
      return await Yslow.generateReport(data.upload.path)
    } catch (err) {
      request.log(['YSLOWERROR'], err.message)
      return h.response(err.message).code(422)
    }
  }
})

const options = {
  reporters: {
    fileReporter: [{
      module: 'good-squeeze',
      name: 'Squeeze',
      args: [{ response: '*', error: '*', request: '*' }]
    },{
      module: 'good-squeeze',
      name: 'SafeJson'
    },{
      module: 'good-file',
      args: ['./logs/BVLogs.log']
    }]
  }
}

const registerAndStart = async () => {
  await server.register({
    plugin: require('good'),
    options: options
  })

  await server.start()
}

registerAndStart()

process.on('unhandledRejection', (err) => {
  server.log(['UNHANDLEDREJECTION'], err.message)
  process.exit(1)
})
