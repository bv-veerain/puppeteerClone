'use strict'

const puppeteer = require('puppeteer')
const PuppeteerHar = require('puppeteer-har')
const allowScreenshotRespCode = [200, 404]
const uBlock = "./uBlock0.chromium"
const Jimp = require('jimp')
const genRandomSequence = () => {
	return Math.floor(Math.random() *100000000000000)
}

const pageGotoOptions = {
	waitUntil: 'networkidle0',
	timeout: 40000
}

const launchChromeWithNewPage = async (args) => {
	const browser = await puppeteer.launch({
		ignoreHTTPSErrors: true,
		args: args
	})
	const page = await browser.newPage()
	return {
		browser: browser,
		page: page
	}
}

const setViewPortAndHeader = async (page, options={}) => {
	await page.setExtraHTTPHeaders({
		'Authorization': 'Basic ' + Buffer.from(`${options.username}:${options.password}`).toString('base64')
	})
	await page.setViewport({
		width: options.width || 1366,
		height: options.height || 768
	})
	return page
}

const autoScroll = async (page) => {
	return await page.evaluate(async () => {
		await new Promise((resolve, reject) => {
			let totalHeight = 0
			let distance = 200
			let timer = setInterval(() => {
				let scrollHeight = document.body.scrollHeight
				window.maxHeight = scrollHeight
				window.scrollBy(0, distance)
				totalHeight += distance
				if(totalHeight >= scrollHeight || totalHeight > 15000){
					clearInterval(timer)
					resolve()
				}
			}, 200, true)
		})
		window.scrollTo(0, 0)
		return maxHeight
	})
}

const disableGifImages = async (page) => {
	await page.setRequestInterception(true)
	page.on('request', request => {
		if (request.resourceType() === 'image' && new RegExp("http.*\.gif").exec(request.url())) {
			request.abort();
		} else {
			request.continue();
		}
	})
}

const disableAnimation = async (page) => {
	await page.evaluateOnNewDocument(() => {
		window.originalSetTimeout = window.setTimeout
		window.originalInterval = window.setInterval
		window.timeouts = {}
		window.intervals = {}
		window.hash = function(content) {
			var hash = 0, i, chr
			if (content.length === 0) return hash
			for (i = 0; i < content.length; i++) {
				chr   = content.charCodeAt(i)
				hash  = ((hash << 5) - hash) + chr
				hash |= 0
			}
			return hash
		}
		window.setTimeout = function(func, delay) {
			window.timeoutID = 0
			window.handler = hash(func.toString())
			if (window.timeouts[window.handler]) {
				window.timeouts[window.handler] = window.timeouts[window.handler] + 1
			} else {
				window.timeouts[window.handler] = 1
			}
			if (window.timeouts[window.handler] < 1000) {
				window.timeoutID = window.originalSetTimeout(func, 1)
			} else {
				window.timeoutID = window.originalSetTimeout(() => {}, 100000)
			}
			return window.timeoutID
		}

		window.counter = 0
		window.setInterval = function(func, delay, flag = false) {
			window.counter++
			if (window.counter > 10 && !flag) {
				return 0
			}
			let id = 0
			if (flag) {
				id = window.originalInterval(func, delay)
			} else {
				id = window.originalInterval(() => {
					window.intervals[window.counter] = (window.intervals[window.counter] || 0) + 1
					if (window.intervals[window.counter] >= 100) {
						clearInterval(id)
					} else {
						func()
					}
				}, 20)
			}
			return id
		}
	})
}

exports.generateHarAndScreenshot = async (url, proxy_server, username, password, options, request) => {
	let browser, pid, args, page
	let seq_no = genRandomSequence()
	args = proxy_server ? [ `--proxy-server=${proxy_server}` ] : []
	args = args.concat(['--no-sandbox','--disable-web-security','--disable-gpu', '--hide-scrollbars', '--disable-setuid-sandbox'])
	if (options.ads_disbaled) {
		args = args.concat([`--disable-extensions-except=${uBlock}`, `--load-extension=${uBlock}`])
	}
	let task = 'HARANDSCREENSHOTINFO'
	try {
		request.log([task],`${seq_no}-BROWSER_LAUNCHING-${url}`)
		let res = await launchChromeWithNewPage(args)
		browser = res.browser
		page = res.page
		pid = browser.process().pid
		request.log([task],`${seq_no}-BROWSER_LAUNCHED_WITH_NEW_PAGE-${url}-${pid}`)
		page = await setViewPortAndHeader(page, {username:username, password:password})
		request.log([task],`${seq_no}-APPLIED_VIEW_PORT_AND_HEADER-${url}-${pid}`)
		const har = new PuppeteerHar(page)
		await har.start()
		request.log([task],`${seq_no}-HAR_STARTED-${url}-${pid}`)
		if (options.gifs_disabled) {
			await disableGifImages(page)
		}
		if (options.animations_disabled) {
			await disableAnimation(page)
		}
		const response = await page.goto(url, pageGotoOptions)
		request.log([task],`${seq_no}-URL_LOADED-${url}-${pid}`)
		const data = await Promise.race([har.stop(), new Promise((resolve) => setTimeout(resolve, 20000, 'Har Timed Out'))])
		if (data == 'Har_TimedOut') {
			throw Error('Har_TimedOut')
		}
		if (allowScreenshotRespCode.includes(response.status())) {
			request.log([task],`${seq_no}-HAR_STOPPED-${url}-${pid}`)
			await page.addStyleTag({path: 'page.css'})
			request.log([task],`${seq_no}-SCROLLING_PAGE-${url}-${pid}`)
			const maxHeight = await Promise.race([autoScroll(page), new Promise((resolve) => setTimeout(resolve, 20000, 'Scroll_TimedOut'))])
			if (maxHeight == 'Scroll_TimedOut') {
				request.log([task],`${seq_no}-SCROLLING_TIMEDOUT-${url}-${pid}`)
				throw "Scroll_TimeOut"
			}
			request.log([task],`${seq_no}-SCROLLING_DONE-${url}-${pid}`)
			await page.waitFor(4000)
			await page.evaluate(async () => {
				let newSrc = "https://www.youtube.com/embed/sP6pNfyCiM4sddsdssdds"
				let frames =  jQuery("iframe")
				if (frames) {
					yt_frames.filter("[src*='www.youtube.com/'], [src*='www.youtube-nocookie.com/embed']").attr("src", newSrc)
				}
			})
			var fpageScreenshotEncodedBuf, stitchedFpageScreenshotEncodedBuf
			if (options.stitched_fpage_screenshot) {
				var heightSoFar = 0, stitchedFpageScreenshot, screenshotTimedout = false
				const viewport = await page.viewport()
				stitchedFpageScreenshot = await new Jimp(viewport.width, maxHeight, 0x0)
				for( let itr = 0; (itr * viewport.height) <= maxHeight; itr++) {
					heightSoFar += viewport.height
					let clipHeight =  heightSoFar > maxHeight ? (viewport.height - (heightSoFar - maxHeight)) : viewport.height
					let clipBuf = await Promise.race([page.screenshot({
						type: 'jpeg',
						fullPage: false,
						clip: {x: 0, y: itr * viewport.height, width: viewport.width, height: clipHeight}
					}), new Promise((resolve) => setTimeout(resolve, 20000, 'Screenshot_TimedOut'))
					])
					if (clipBuf == 'Screenshot_TimedOut') {
						screenshotTimedout = true
						request.log([task],`${seq_no}-STITCHED_FULLPAGE_SCREENSHOT_TIMEDOUT-${url}-${pid}`)
						break
					} else {
						let clip = await Jimp.read(clipBuf)
						await stitchedFpageScreenshot.composite(clip, 0, itr * viewport.height)
					}
				}
				if (!screenshotTimedout) {
					let buff = await stitchedFpageScreenshot.getBufferAsync(Jimp.MIME_JPEG)
					stitchedFpageScreenshotEncodedBuf = buff.toString('base64')
					request.log([task],`${seq_no}-STITCHED_FULLPAGE_SCREENSHOT_TAKEN-${url}-${pid}`)
				} else {
					stitchedFpageScreenshotEncodedBuf = "Screenshot_TimedOut"
					request.log([task],`${seq_no}-STITCHED_FULLPAGE_SCREENSHOT_TIMEDOUT-${url}-${pid}`)
				}
			}
			if (options.fpage_screenshot || !options.stitched_fpage_screenshot) {
				fpageScreenshotEncodedBuf = await Promise.race([
					page.screenshot({type: 'jpeg', encoding: 'base64', fullPage: true}),
					new Promise((resolve) => setTimeout(resolve, 20000, 'Screenshot_TimedOut'))
				])
				if ( fpageScreenshotEncodedBuf == 'Screenshot_TimedOut') {
					request.log([task],`${seq_no}-FULLPAGE_SCREENSHOT_TIMEDOUT-${url}-${pid}`)
				} else {
					request.log([task],`${seq_no}-FULLPAGE_SCREENSHOT_TAKEN-${url}-${pid}`)
				}
			}
			const screenshot = await Promise.race([
				page.screenshot({type: 'jpeg', encoding: 'base64'}),
				new Promise((resolve) => setTimeout(resolve, 20000, 'Screenshot_TimedOut'))
			])
			if (screenshot === 'Screenshot_TimedOut') {
				request.log([task],`${seq_no}-SCREENSHOT_TIMEDOUT-${url}-${pid}`)
			} else {
				request.log([task],`${seq_no}-SCREENSHOT_TAKEN-${url}-${pid}`)
			}
			return {
				http_resp_code: response.status(),
				har: data,
				fold_screenshot: screenshot,
				fpage_screenshot: fpageScreenshotEncodedBuf,
				stitched_fpage_screenshot: stitchedFpageScreenshotEncodedBuf
			}
		} else {
			request.log([task], `${seq_no}-SCREENSHOT_FAILED-${url}-${pid}`)
			return {
				site_resp_code: response.status()
			}
		}
	} catch (err) {
		request.log(['HARANDSCREENSHOTERROR'], `${seq_no}-SCREENSHOT_ERRORS-${url}-${pid}-${err.message}`)
		throw err
	} finally {
		if (browser){
			try {
				if (page){
					await page.close()
				}
				await browser.close()
				request.log([task],`${seq_no}-BROWSER_CLOSED-${url}-${pid}`)
			} catch (err){
				request.log(['HARANDSCREENSHOTERROR'],`${seq_no}-BROWSER_CLOSING_ERRORS-${url}-${pid}`)
			}
		} else {
			request.log(['HARSCREENSHOTINFO'],`${seq_no}-NO_BROWSER-${url}-${pid}`)
		}
	}
}

exports.capturePdf = async (url, proxy_server, username, password, options, request) => {
	let browser, pid, page
	let task = 'CAPTUREPDF'
	let args = proxy_server ? [ `--proxy-server=${proxy_server}` ] : []
	let seq_no = genRandomSequence()
	try {
		request.log([task],`${seq_no}-BROWSER_LAUNCHING-${url}`)
		let res = await launchChromeWithNewPage(args)
		browser = res.browser
		page = res.page
		pid = browser.process().pid
		request.log([task],`${seq_no}-BROWSER_LAUNCHED_WITH_NEW_PAGE-${url}-${pid}`)
		page = await setViewPortAndHeader(page, {username:username, password:password})
		request.log([task],`${seq_no}-APPLIED_VIEW_PORT_AND_HEADER-${url}-${pid}`)
		await page.goto(url, pageGotoOptions)
		request.log([task],`${seq_no}-URL_LOADED-${url}-${pid}`)
		const pdf = await page.pdf({
			printBackground: true,
			width: 1100,
			height: 1027,
			margin: {
				top: options.top || 10,
				right: options.right || 100,
				bottom: options.bottom || 10,
				left: options.left || 100
			}
		})
		request.log([task],`${seq_no}-PDF_CAPTURED-${url}-${pid}`)
		return {
			pdf: Buffer.from(pdf).toString('base64')
		}
	} catch (err) {
		request.log(['CAPTUREPDF_ERROR'], `${seq_no}-CAPTURE_PDF_FAILED-${url}-${pid}-${err.message}`)
		throw err
	} finally {
		if (browser){
			try {
				if (page){
					await page.close()
				}
				await browser.close()
				request.log([task],`${seq_no}-BROWSER_CLOSED-${url}-${pid}`)
			} catch (err){
				request.log(['CAPTUREPDF_ERROR'],`${seq_no}-BROWSER_CLOSING_ERRORS-${url}-${pid}`)
			}
		} else {
			request.log(['CATUREPDF_INFO'],`${seq_no}-NO_BROWSER-${url}-${pid}`)
		}
	}
}

exports.loadPage = async (page_src, request) => {
	const fs = require('fs')
	const path = require('path')
	let browser, pid, page
	let new_tab_urls = []
	let requests = []
	let responses = {}
	let task = 'LOAD_PAGE'
	let seq_no = genRandomSequence()
	let dir = path.join(__dirname, 'local_html')
	let page_src_fname = `page-source-${seq_no}.html`
	let page_src_fpath = `${dir}/${page_src_fname}`

	try {
		if (!fs.existsSync(dir)){
			fs.mkdirSync(dir)
		}
		fs.writeFileSync(page_src_fpath, page_src, {mode: 0o644})

		request.log([task],`${seq_no}-BROWSER_LAUNCHING`)
		let res = await launchChromeWithNewPage([])
		browser = res.browser
		page = res.page
		pid = browser.process().pid
		request.log([task],`${seq_no}-BROWSER_LAUNCHED_WITH_NEW_PAGE-${pid}`)
		browser.on('targetcreated', async target => {
			let new_page = await target.page()
			if (new_page && target.url() !== 'about:blank') {
				new_tab_urls.push(Buffer.from(target.url()).toString('base64'))
			}
		})
		page.on('request', request => {
			if (!request.url().match(/^data:/)) {
				requests.push(Buffer.from(request.url()).toString('base64'))
			}
			request.continue()
		})
		page.on('response', response => {
			if (!response.url().match(/^data:/)) {
				let resp = {}
				let resp_code = response.status()
				resp["code"] = resp_code
				if ((resp_code >= 300) && (resp_code <= 399)) {
					resp["location"] = Buffer.from(response.headers()['location']).toString('base64')
				}
				responses[Buffer.from(response.url()).toString('base64')] = resp
			}
		})
		await page.goto('http://localhost:9090/' + page_src_fname)
		await page.waitFor(3000) //wait for 3 seconds.
		await page.mouse.click(1000, 1000)
		await page.waitFor(1000) //wait for 1 seconds.
		let new_page_src = Buffer.from(await page.content()).toString('base64')
		request.log([task],`${seq_no}-SOURCE_LOADED-${pid}`)
		return {
			page_url: Buffer.from(page.url()).toString('base64'),
			requests: requests,
			responses: responses,
			new_tab_urls: new_tab_urls,
			new_page_src: new_page_src
		}
	} catch (err) {
		request.log(['SOURCE_LOAD_ERROR'], `${seq_no}-SOURCE_LOAD_FAILED-${pid}-${err.message}`)
		throw err
	} finally {
		if (browser) {
			if (page){
				await page.close()
			}
			await browser.close()
			request.log([task],`${seq_no}-BROWSER_CLOSED-${pid}`)
		}
		if (fs.existsSync(page_src_fpath)) {
			fs.unlinkSync(page_src_fpath)
		}
	}
}
