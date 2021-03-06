'use strict'

const Hapi = require('hapi')
const Puppeteer = require('./puppeteer.js')
const Esprima = require('esprima')
const Diff = require('./diff.js')
const ScreenshotDiff = require('./screenshotdiff.js')
const server = Hapi.server({
	port: 8080,
	host: '127.0.0.1'
})

server.route({
	method: 'POST',
	path: '/visit_urls',
	config:{
		payload: {
			maxBytes: 1024 * 1024 * 25
		}
	},
	handler: async(request, h) => {
		try {
			const data = request.payload
			let res = await Puppeteer.visitUrls(data.urls, data.headers, request)
			return (JSON.stringify(res))
		}catch (err) {
			request.log(['SITE_LOAD_ERROR'], err.message)
			return h.response(err.message).code(422)
		}
	}
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
				bottom: data.bottom,
				pageOptions: data.page_options
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
	path: '/screenshot_diff',
	handler: async(request, h) => {
		try {
			const data = request.payload
			let resp = await ScreenshotDiff.calculateDiff(
				data.screenshot_url,
				data.target_screenshot_url,
				request
			)
			return (JSON.stringify(resp))
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
				data.options,
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
	path: '/preview_report',
	handler: async(request, h) => {
		try {
			const data = request.payload
			let screenshot = await Puppeteer.reportPreview(
				data.url,
				data.proxy,
				data.username,
				data.password,
				data.options,
				request
			)
			return (JSON.stringify(screenshot))
		} catch (err) {
			return h.response(err.message).code(422)
		}
	}
})

server.route({
	method: 'POST',
	path: '/load_page',
	config: {
		payload: {
			maxBytes: 1024 * 1024 * 25
		}
	},
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
	path:'/tokenize',
	config: {
		payload: {
			maxBytes: 1024 * 1024 * 25
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

server.route({
	method: 'POST',
	path: '/calculate_diff',
	handler: (request, h) => {
		try {
			const params = request.payload
			let result = Diff.calculate_diff_hash(params)
			return JSON.stringify(result)
		} catch (err) {
			request.log(['DIFF_ERROR'], err.message)
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

process.setMaxListeners(8192)

process.on('unhandledRejection', (err) => {
	server.log(['UNHANDLEDREJECTION'], err.message)
})
