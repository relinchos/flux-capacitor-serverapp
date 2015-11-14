var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname);

app.start = function() {
  // start the web server
  return app.listen(function() {
  	app.emit('started');
  	console.log('Web server listening at: %s', app.get('url'));
  });
};

// start the server if `$ node server.js`
if (require.main === module) {
	app.start();
}




var path = require('path'); 
//app.use(loopback.static(path.resolve(__dirname, '../client/v0.1.0/'))); 



// Storage
// =======

// var storageDir = path.resolve(path.join(__dirname, '/../storage'));
// app.set( 'localFileStorageDir', storageDir );
// //console.log( 'storageDir: '+storageDir );
// var ds = loopback.createDataSource({
// 	name: 'localFilesRepo',
// 	connector: require('loopback-component-storage'),
// 	provider: 'filesystem',
// 	root: storageDir
// });
// var container = ds.attach( app.models.FileStorage );










// -- Add your pre-processing middleware here --
// app.use(loopback.context());
// app.use(loopback.token());
// app.use(function setCurrentUser(req, res, next) { console.log(' middleware uesr ')
//   if (!req.accessToken) {
//     return next();
//   }
//   app.models.UserModel.findById(req.accessToken.userId, function(err, user) { 

//   	console('found user:', user, '\n\n\n');

//     if (err) {
//       return next(err);
//     }
//     if (!user) {
//       return next(new Error('No user with this access token was found.'));
//     }
//     var loopbackContext = loopback.getCurrentContext();
//     if (loopbackContext) {
//       loopbackContext.set('currentUser', user);
//     }
//     next();
//   });
// });





// Config vars
// ===========


// Automatically send verification email upon user creation
app.set('signup_autoSendVerification', false );

// Account (email) need to be verified to be able to login
app.set('login_emailVerificationRequired', false );
app.models.User.settings.emailVerificationRequired = app.settings.login_emailVerificationRequired;






