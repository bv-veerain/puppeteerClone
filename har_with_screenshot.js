class CustomError extends Error {
	constructor ( message, error_code ) {
		super()
		Error.captureStackTrace( this, this.constructor )
		this.name = 'CustomError'
		this.message = message
		if ( error_code ) this.error_code = error_code
	}
}

var http = require('http');
const puppeteer = require('puppeteer');
const PuppeteerHar = require('puppeteer-har');
const server = http.createServer();

server.on('request',async (req, res) => 
	{ 
		try
		{
			if(req.method == 'GET')
			{
				const buffer =  await generate_screenshot_har(req.headers.link, req.headers.proxy_server);
				var result = JSON.stringify({ har : buffer["har"],
					site_screenshot : buffer["site_screenshot"],
					full_site_screenshot : buffer["full_site_screenshot"] });
				res.end(result);
			}
		}
		catch(err)
		{
			if(err.error_code === undefined)
				err.error_code = 422;
			res.writeHead(err.error_code);
			res.end(err.message);
		}
	}).listen(8080);

async function generate_screenshot_har(link, proxy_server)
{
	const browser = await puppeteer.launch({headless: true, slowmo: 0, ignoreHTTPSErrors: true,
		args: [ '--proxy-server = ' + proxy_server ]});
	const page = await browser.newPage();
	await page.setExtraHTTPHeaders({'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'});
	const har = new PuppeteerHar(page);
	await har.start();
	const response = await page.goto(link, { networkIdle2Timeout: 5000, waitUntil: 'load',
		timeout: 40000 });
	await page.setViewport({
		width: 1366,
		height: 768
	});
	data  =  await har.stop();
	const fullpagescreenshot = await page.screenshot({type: 'png', encoding: 'base64', fullPage: true});
	const screenshot = await page.screenshot({type: 'png', encoding: 'base64'});
	browser.close();
	if(response.status() != 200)
	{
		error = new CustomError('Puppeteer is Fine. Unable to Load URL '+link, response.status());
		throw error;
	}
	return { har : JSON.stringify(data), site_screenshot : screenshot, full_site_screenshot : fullpagescreenshot };
}
