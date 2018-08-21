class CustomError extends Error {
	constructor ( message, error_code ) {
		super()
		Error.captureStackTrace( this, this.constructor )
		this.name = 'CustomError'
		this.message = message
		if ( error_code ) this.error_code = error_code
	}
}
module.exports = CustomError

