class UnableToLoadSiteError extends Error {
	constructor(message, errorCode) {
		super(message)
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor)
		if(errorCode)
			this.errorCode = errorCode
	}
}

module.exports = {
	UnableToLoadSiteError
}
