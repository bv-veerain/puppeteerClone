'use strict'

const Hapi = require('hapi')
const Puppeteer = require('./puppeteer.js')
const Yslow = require('./yslow.js')
const Esprima = require('esprima')
const fs = require('fs')

const server = Hapi.server({
	port: 8080,
	host: '127.0.0.1'
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
				data.password,
				request
			)
			return (JSON.stringify(har_and_screenshot))
		} catch (err) {
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
			output: 'file',
			uploads: __dirname + '/yslow_files/'}
	},
	handler: async (request, h) => {
		var data
		try {
			data = request.payload
			return await Yslow.generateReport(data.upload.path)
		} catch (err) {
			request.log(['YSLOWERROR'], err.message)
			return h.response(err.message).code(422)
		} finally {
			if(data.upload.path) {
				fs.unlinkSync(data.upload.path)
			} else {
				request.log(['YSLOWERROR'], 'FILE DOESNOT EXIST')
			}
		}
	}
})

server.route({
	method: 'POST',
	path:'/tokenize',
	handler: (request, h) => {
		try {
			let tokens;
			tokens = Esprima.tokenize(request.payload.content, {loc: true })
			return JSON.stringify(tokens)
		} catch (err) {
			request.log(['TOKENIZER_ERROR'], err.message)
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

process.setMaxListeners(1000)

process.on('unhandledRejection', (err) => {
	server.log(['UNHANDLEDREJECTION'], err.message)
})
