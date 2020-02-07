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
	await page.evaluate(async () => {
		await new Promise((resolve, reject) => {
			let totalHeight = 0
			let distance = 200
			let timer = setInterval(() => {
				let scrollHeight = document.body.scrollHeight
				window.maxHeight = scrollHeight
				window.scrollBy(0, distance)
				totalHeight += distance
				if(totalHeight >= scrollHeight || totalHeight > 20000){
					clearInterval(timer)
					resolve()
				}
			}, 200, true)
		})
		window.scrollTo(0, 0)
		return maxHeight
	})
	return await page.evaluate(async () => { return document.body.scrollHeight })
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
			let handler = hash(func.toString())
			if ((window.timeouts[handler] || 0) < 1500) {
				window.timeouts[handler] = (window.timeouts[handler] || 0) + 1
				window.timeoutID = window.originalSetTimeout(func, 1)
			} else {
				window.timeoutID = window.originalSetTimeout(() => {}, 100000)
			}
			return window.timeoutID
		}
		window.counter = 0
		window.setInterval = function(func, delay, flag = false) {
			if (window.counter > 10 && !flag) {
				return 0
			}
			let id = 0
			if (flag) {
				id = window.originalInterval(func, delay)
			} else {
				id = window.originalInterval((func) => {
					func()
					clearInterval(id)
				}, 100000, func)
			}
			return id
		}
	})
}

const scrollPageTo = async(page, height) => {
	await page.evaluate(
		async (height) => {
			window.scrollTo(0, height);
			try {
				if (jQuery) {
					jQuery('body').animate({ scrollTop: height }, 0);
				} else if ($) {
					$('body').animate({ scrollTop: height }, 0);
				}
			} catch(e) {}
		}, height)
}

const captureStitchedFpageScreenshot = async (page, maxHeight, url, seq_no, pid, task, request) => {
	let heightSoFar = 0, stitchedFpageScreenshot, screenshotTimedout = false
	let viewport = await page.viewport()
	stitchedFpageScreenshot = await new Jimp(viewport.width, maxHeight, 0x0)
	for( let itr = 0; heightSoFar <= maxHeight; itr++) {
		heightSoFar += viewport.height
		let height = itr * viewport.height
		let clipHeight =  heightSoFar > maxHeight ?
			(viewport.height - (heightSoFar - maxHeight)) : viewport.height
		if (clipHeight < viewport.height) {
			await page.setViewport({
				width: viewport.width,
				height: clipHeight
			})
			await scrollPageTo(page, maxHeight)
		} else {
			await scrollPageTo(page, height)
		}
		let clipBuf = await Promise.race([
			page.screenshot({type: 'jpeg'}),
			new Promise((resolve) => setTimeout(resolve, 20000, 'Screenshot_TimedOut'))
		])
		if (clipBuf == 'Screenshot_TimedOut') {
			screenshotTimedout = true
			break
		} else {
			let clip = await Jimp.read(clipBuf)
			await stitchedFpageScreenshot.composite(clip, 0, itr * viewport.height)
		}
	}
	if (!screenshotTimedout) {
		let buff = await stitchedFpageScreenshot.getBufferAsync(Jimp.MIME_JPEG)
		request.log([task],`${seq_no}-STITCHED_FULLPAGE_SCREENSHOT_TAKEN-${url}-${pid}`)
		return buff.toString('base64')
	} else {
		request.log([task],`${seq_no}-STITCHED_FULLPAGE_SCREENSHOT_TIMEDOUT-${url}-${pid}`)
		return "Screenshot_TimedOut"
	}
}

const captureFpageScreenshot = async (page, url, pid, seq_no, task, request) => {
	let fpageScreenshotEncodedBuf = await Promise.race([
		page.screenshot({type: 'jpeg', encoding: 'base64', fullPage: true}),
		new Promise((resolve) => setTimeout(resolve, 20000, 'Screenshot_TimedOut'))
	])
	if ( fpageScreenshotEncodedBuf == 'Screenshot_TimedOut') {
		request.log([task],`${seq_no}-FULLPAGE_SCREENSHOT_TIMEDOUT-${url}-${pid}`)
	} else {
		request.log([task],`${seq_no}-FULLPAGE_SCREENSHOT_TAKEN-${url}-${pid}`)
	}
	return fpageScreenshotEncodedBuf
}

const captureFoldScreenshot = async (page, url, pid, seq_no, task, request) => {
	let foldScreenshotEncodedBuf = await Promise.race([
		page.screenshot({type: 'jpeg', encoding: 'base64'}),
		new Promise((resolve) => setTimeout(resolve, 20000, 'Screenshot_TimedOut'))
	])
	if (foldScreenshotEncodedBuf === 'Screenshot_TimedOut') {
		request.log([task],`${seq_no}-SCREENSHOT_TIMEDOUT-${url}-${pid}`)
	} else {
		request.log([task],`${seq_no}-SCREENSHOT_TAKEN-${url}-${pid}`)
	}
	return foldScreenshotEncodedBuf
}

const disbaleYTFrames = async (page) => {
	await page.evaluate(async () => {
		let frames =  jQuery("iframe")
		let newSrc = "https://www.youtube.com/embed/sP6pNfyCiM4sddsdssd"
		if (frames) {
			frames.filter("[src*='www.youtube.com/'], [src*='www.youtube-nocookie.com/embed']").attr("src", newSrc)
		}
	})
}

exports.generateHarAndScreenshot = async (url, proxy_server, username, password, options, request) => {
	let browser, pid, args, page
	let seq_no = genRandomSequence()
	args = proxy_server ? [ `--proxy-server=${proxy_server}` ] : []
	args = args.concat(['--no-sandbox','--disable-web-security',
		'--disable-gpu', '--hide-scrollbars', '--disable-setuid-sandbox'])
	if (options.ads_disabled) {
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
		const pageOptions = {
			waitUntil: 'networkidle2',
			timeout: 40000
		}
		const response = await page.goto(url, pageOptions)
		request.log([task],`${seq_no}-URL_LOADED-${url}-${pid}`)
		const data = await Promise.race([
			har.stop(), new Promise((resolve) => setTimeout(resolve, 20000, 'Har Timed Out'))
		])
		if (data == 'Har_TimedOut') {
			throw Error('Har_TimedOut')
		}
		request.log([task],`${seq_no}-HAR_STOPPED-${url}-${pid}`)
		if (allowScreenshotRespCode.includes(response.status())) {
			await page.addStyleTag({path: 'page.css'})
			if (options.yt_frames_disabled) {
				try {
					await disbaleYTFrames(page)
				} catch (err) {
					request.log([task],`${seq_no}-YTFRAMESDISABLEDERROR-${err.message}-${url}-${pid}`)
				}
			}
			await page.waitFor(options.delay)
			request.log([task],`${seq_no}-SCROLLING_PAGE-${url}-${pid}`)
			let maxHeight = await Promise.race([
				autoScroll(page), new Promise((resolve) => setTimeout(resolve, 35000, 'Scroll_TimedOut'))
			])
			if (maxHeight == 'Scroll_TimedOut') {
				request.log([task],`${seq_no}-SCROLLING_TIMEDOUT-${url}-${pid}`)
				throw Error("Scroll_TimeOut")
			}
			maxHeight = maxHeight < 20000 ? maxHeight : 20000
			request.log([task],`${seq_no}-SCROLLING_DONE-${url}-${pid}`)
			await page.waitFor(4000)
			let fpageScreenshotEncodedBuf, stitchedFpageScreenshotEncodedBuf, foldScreenshotEncodedBuf
			if (options.stitched_fpage_screenshot) {
				stitchedFpageScreenshotEncodedBuf = await captureStitchedFpageScreenshot(
					page, maxHeight, url, seq_no, pid, task, request
				)
			}
			if (options.fpage_screenshot) {
				fpageScreenshotEncodedBuf = await captureFpageScreenshot(page, url, pid, seq_no, task, request)
			}
			foldScreenshotEncodedBuf = await captureFoldScreenshot(page, url, pid, seq_no, task, request)
			return {
				http_resp_code: response.status(),
				har: data,
				fold_screenshot: foldScreenshotEncodedBuf,
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
		request.log(['HARANDSCREENSHOTERROR'],
				`${seq_no}-SCREENSHOT_ERRORS-${url}-${pid}-${err.message}`)
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
		const pageOptions = { printBackground: true,
			margin: {
				top: options.top || 10,
				right: options.right || 100,
				bottom: options.bottom || 10,
				left: options.left || 100
			},
			...options.pageOptions
		}
		const pdf = await page.pdf(pageOptions)
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
		await page.setJavaScriptEnabled(false)
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
