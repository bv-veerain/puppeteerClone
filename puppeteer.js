'use strict'

const puppeteer = require('puppeteer')
const PuppeteerHar = require('puppeteer-har')
const AllowScreenshotRespCode = [200, 404]

exports.generateHarAndScreenshot = async (url, proxy_server, username, password, request) => {
  var browser, pid
  try {
		browser = await puppeteer.launch({
			ignoreHTTPSErrors: true,
      args: [ `--proxy-server = ${ proxy_server}` ]
    })
    pid = browser.process().pid
    const page = await browser.newPage()
    if (username && password) {
      await page.authenticate({username: username, password: password})
    }
    await page.setExtraHTTPHeaders({'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'})
    await page.setViewport({width: 1366, height: 768})
    const har = new PuppeteerHar(page)
		await har.start()
    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 40000
    })
		const data = await har.stop()
    if (AllowScreenshotRespCode.includes(response.status())) {
			const fullPageScreenshot = await Promise.race([
				page.screenshot({type: 'jpeg', encoding: 'base64', fullPage: true}),
				new Promise((resolve, reject) => setTimeout(resolve, 20000, 'Full Screenshot Timed Out'))
			])
			if(fullPageScreenshot === 'Full Screenshot Timed Out') {
				request.log(['HARANDSCREENSHOTINFO'], `${fullPageScreenshot} : ${url} : ${pid}`)
			}
			const screenshot = await Promise.race([
				page.screenshot({type: 'jpeg', encoding: 'base64'}),
				new Promise((resolve, reject) => setTimeout(resolve, 20000, 'Site Screenshot Timed Out'))
			])
			if(screenshot === 'Site Screenshot Timed Out') {
				request.log(['HARANDSCREENSHOTINFO'], `${screenshot} : ${url} : ${pid}`)
			}
			return {
        site_resp_code: response.status(),
        har: data,
        site_screenshot: screenshot,
        full_site_screenshot: fullPageScreenshot
      }
    } else {
      return {
        site_resp_code: response.status()
      }
    }
	} catch (err) {
		request.log(['HARANDSCREENSHOTERROR'], `${url} : ${pid} : ${err.message}`)
    throw err
  } finally {
    if (browser){
      try{
        await browser.close()
      } catch(err){
        request.log(['HARSCREENSHOTINFO'], `CLOSE_ERROR : ${url} : ${pid} : ${err.message}`)
      }
    } else {
        request.log(['HARSCREENSHOTINFO'], `NO_BROWSER : ${url}`)
    }
  }
}
