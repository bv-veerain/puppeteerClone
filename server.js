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
	path: '/capture_pdf',
	handler: async(request, h) => {
		try {
			const data = request.payload
			// constructing options directly through data (and not nested data object)
			// to avoid query-params parsing here.
			let options = {
				left: data.left,
				right: data.right,
				top: data.top,
				bottom: data.bottom
			}
			let encoded_pdf = await Puppeteer.capturePdf(
				data.url,
				data.proxy,
				data.username,
				data.password,
				options,
				request
			)
			return (JSON.stringify(encoded_pdf))
		} catch (err) {
			return h.response(err.message).code(422)
		}
	}
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
	path: '/load_page',
	handler: async(request, h) => {
		try {
			let res = await Puppeteer.loadPage(request.payload.page_src, request)
			return (JSON.stringify(res))
		} catch (err) {
			request.log(['LOAD_PAGE_ERROR'], err.message)
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
	config: {
		payload: {
			maxBytes: 1000 * 1000 * 25
		}
	},
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
