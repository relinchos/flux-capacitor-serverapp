module.exports = function() {
	return function logError(  err, req, res, next) {

		//console.log('ERR -+-+-++-+-+-+-+ ', req.url, err );

		switch( err.status ) {

			case 401:


			break;

			default: // 404

			// res.status(404);
			// res.format({
			// 	text: function(){
			// 		res.send('Not found')
			// 	},

			// 	html: function(){
			// 		res.redirect(301, '/#/404')
			// 	},

			// 	json: function(){
			// 		res.send( { error: 'Not found', errorReason: 'notFound' } )
			// 	}
			// });

		


			break;


		};



		


		next( );

	};
};