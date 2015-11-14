// Solution on extending built in models inspired from this GIST:
// https://gist.github.com/pulkitsinghal/43d4bae2467c686ec55b


module.exports = function(app) {

	var User = app.models.User; 
	var Person = app.models.Person;
	var Role = app.models.Role;
	var RoleMapping = app.models.RoleMapping;
	var FileStorage = app.models.FileStorage;
	var File = app.models.File;

	var _ = require('lodash');
	var loopback = require('loopback');

	var Email = app.models.Email;
	var MailRepo = app.models.MailRepo;

	// var events = require('events');
	// var eventEmitter = new events.EventEmitter();




	//User.settings.hidden = User.settings.hidden || [];
	//User.settings.hidden.push('id');

	User.settings.strict = true;
	
	// Add ACLs
	User.settings.acls.push(
	{ 
		principalType: 'ROLE',
		principalId: 'admin',
		permission: 'ALLOW',
		accessType: 'READ'
	},
	{ 
		principalType: 'ROLE',
		principalId: 'admin',
		permission: 'ALLOW',
		accessType: 'WRITE'
	},
	{
		"principalType": "ROLE",
		"principalId": "$everyone",
		"permission": "ALLOW",
		"property": "resetPassword",
		"accessType": "EXECUTE"
	},
	{
		"principalType": "ROLE",
		"principalId": "$everyone",
		"permission": "ALLOW",
		"property": "changePassword",
		"accessType": "EXECUTE"
	}
	,
	{
		"principalType": "ROLE",
		"principalId": "$everyone",
		"permission": "ALLOW",
		"property": "fixDuplicates",
		"accessType": "EXECUTE"
	}
	);



	// Add User relations
	var options = {
		relations: {
			person: {
				model: 'Person',
				type: 'hasOne',
				foreignKey: 'user'
			}
		}
	};


	User.hasOne(Person, { foreignKey: 'user', as: 'associatedPerson'});
	Person.hasOne(User, { foreignKey: 'person', as: 'associatedUser'});



	
	
	User.beforeRemote('login', function(ctx, user, next) {

		if( app.settings['login_emailVerificationRequired'] ) {
			var userEmail = ctx.req.body.email;
			User.findOne({ where: { email: userEmail }}, function(err, user) { 
				if( user && !user.emailVerified && !err ){
					return ctx.res.status(401).send({ errorReason: 'needVerification' });
				}else{
					next();
				}
			});
		} else {
			next();
		};
	});




	User.afterRemote('find', function(ctx, usersData, next) {
		
		var modifiedResponse = [];
		var usersData_LEN = usersData.length;

		_.forEach(usersData, function( userData ){

			var editableUserData =  _.pick( userData.toJSON() , _.identity); 

			getUserRoles( 
				userData.id , 
				function( resposeArray ){ 
					editableUserData.roles = resposeArray;
					modifiedResponse.push( editableUserData );
					if ( modifiedResponse.length === usersData_LEN ){
						return ctx.res.status(200).send( modifiedResponse );
					}
				},
				function( err ){ 
					return ctx.res.status(500).send( err ) 
				});
		});
	});

	

	var attachRoles = function(ctx, userData, next) {

		var editableUserData =  _.pick( userData.toJSON() , _.identity);

		getUserRoles( 
			userData.id , 
			function( resposeArray ){ 
				editableUserData.roles = resposeArray;
				return ctx.res.status(200).send( editableUserData );
			},
			function( err ){ 
				return ctx.res.status(500).send( err ) 
			}
			);
	};

	User.afterRemote('findOne', attachRoles );
	User.afterRemote('findById', attachRoles );

	

	User.afterRemote('login', function(ctx, newSession, next) {

		//var _ = require('lodash');



		var editableResponse =  newSession.toJSON();

		var editableUserData        = editableResponse.user 
		var editableUserData__clean = _.pick( editableUserData , _.identity); // without properties with "falsey" value

		var editableResponse__clean = editableResponse;
		editableResponse__clean.user = editableUserData__clean;
		editableResponse__clean = _.pick( editableResponse__clean  , _.identity) ; // without properties with "falsey" value 
		
		setTimeout(function(){
			
			var userId = editableResponse.user.id;


			if(!userId){
				// This means that the method didn't asked to include "User" data so it should return now.
				return ctx.res.status(200).send( editableResponse__clean );
			};
			
			// get user rles
			getUserRoles( 
				userId , 
				function( resposeArray ){ //console.log( resposeArray )
					editableResponse__clean.user.roles = resposeArray;

					// Role Creation Permissions
					var roleCreationPermissions = getRoleCreationPermissions( resposeArray );
					if( roleCreationPermissions.length ){
						editableResponse__clean.user.roleCreationPermissions = roleCreationPermissions;
					};

					// Done

					// Find or create avatarUpload url


					// fill 

					// editableResponse__clean.user.urls = {
					// 	avatar: 'some url for upload'
					// };


					// Get asociated Person Data

					//console.log( 'userId::::'+userId)

					Person.findOne( { where: { user: userId } }, 
						function(err, thePerson){

							if(err){
								return next(err);
							};

							//console.log( 'thePErson:', thePerson);

							if( thePerson ){

								//editableResponse__clean.user.username = '';
								editableResponse__clean.user.completeName = thePerson.fullName;
								editableResponse__clean.user.firstName = thePerson.firstName;
								editableResponse__clean.user.lastName = thePerson.lastName;
								editableResponse__clean.user.person = thePerson;
							};

							return ctx.res.status(200).send( editableResponse__clean );
						});
				},
				function( err ){ 
					return ctx.res.status(500).send( err ) 
				}
				);
}, 500);
});




function getUserRoles( userId, sucCb, errCb ){

	var resposeArray;

	RoleMapping.find(
	{ 
		where: { principalType: 'USER', principalId: ''+userId },
		include: ['role'] 
	}, 
	function(err, theRoleMapping){ 

		if ( err ) {
			if(_.isFunction(errCb)){
				errCb( err );
			};
			return false;
		};

		//console.log('theRoleMapping', theRoleMapping)

		var theRoleMapping = theRoleMapping || [];

					if ( theRoleMapping.length ){ // The user has roles assigned

						var roleList = [];
						_.forEach( theRoleMapping, function( item ) { 
							var role = item.toObject().role;
							if( role ){
								if( role.name ){
									roleList.push( role.name );
								}
							}else{
								// The role assigned in this mapping doesn't exist anymore
								// Will be beter to delete this mapping so

								// TODO: delete the role mapping
							}

							
						});

						resposeArray = _.uniq(roleList);
					}else{ // The user has no roles assigned	
						resposeArray = [];
					};

					if(_.isFunction(sucCb)){
						sucCb( resposeArray );
					};
				}); 

};




/*
User.observe('after save', function(ctx, next) {

	var userToCreate = ctx.instance;

	//console.log( 'userToCreate:', ctx.Model.modelName, ctx.instance.id, ctx.options, '----' );

	next();

});
*/

User.beforeRemote('**', function(ctx, modelInstance, next){  

	var methodString = ctx.req.remotingContext.methodString;

	if( ctx.req.method === 'POST' && methodString === 'User.create' ){

		var dni = ctx.req.body.dni;
		//var email = ctx.req.body.email;

		getPersonByDni( 
			dni, 
			function( thePerson ){
				console.log( 'the new person:', thePerson );
				if( thePerson.user ){
					return next( new Error('Ya hay un usuario registrado con este DNI'));
				};
				return next();
			},
			function( err ){
				if(err){
					next( err );
				}else{
					next( new Error( 'No hay ningún alumno registrado con ese DNI'));
				}
			}
			);
	} else {
		next();
	};
});



User.afterRemote('**', function(ctx, modelInstance, next){  

	var methodString = ctx.req.remotingContext.methodString;

	if( ctx.req.method === 'POST' && methodString === 'User.create' ){

		var dni = ctx.req.body.dni;
		var userEmail = modelInstance.email;

		User.findOne( 
			{ where: { email: userEmail } }, 
			function(err, theUser){
				if(err){
					next(err);
				} else {
					if( theUser ){

						var userId = theUser.id;

						getPersonByDni( 
							dni, 
							function( thePerson ){
								
								// Assign existing User to Person
								thePerson.updateAttribute(
									'user', userId, 
									function(err, thePerson){

										// Assign existing Person to User
										theUser.updateAttribute(
											'person', thePerson.id, 
											function(err, theUser){
												next();
											});
									});
							}
							);
					} else {
						next();
					};
				};
			}
			);
	} else {
		next();
	};
});



User.afterCreate = function( next ) {

	var userCreated = this;


	// Send email verification
	if( false && app.settings['signup_autoSendVerification']){

		
		var options = {
			type: 'email',
			to: userCreated.email,
			from: 'noreply@myapp.com',
			subject: 'Thanks for Registering at FooBar'
		};

		userCreated.verify(options, next);

	}else{
		next();
	};
};






var createUser = function( userToCreate ){
	User.findOne( { where: { username: userToCreate.username } }, 
		function(err, theUser){
			if(err){
				//console.log(err);
				return;
			}
			//console.log('\n---------------------------------------');
			if( theUser ){
				console.log('User already exists:', userToCreate.username );
				setUserRoles( theUser, userToCreate.roles );
			}else{
				User.create( userToCreate, function(err, createdUser) {
					console.log('Creating user:', userToCreate.username );
					if (err) {
						return console.error(err);
					} else {
						console.log('User created:', userToCreate.username );
					};
					setUserRoles( createdUser, userToCreate.roles  );
				});
			};
			console.log('---------------------------------------\n');
		});
};


var setUserRoles = function ( user, rolesToAdd ) {

	var user = user;
	var rolesToAdd = rolesToAdd;

	if(!rolesToAdd){
		console.error( 'User "'+user.username+'" has no roles to assign to.', user);
		return;
	};

	if(!_.isArray( rolesToAdd )){
		rolesToAdd = [ rolesToAdd ];
	};


	_.forEach( rolesToAdd, function( roleName ){
		roleGetOrCreateAndAssign( user, roleName );
	});
};


var roleGetOrCreateAndAssign = function( user, roleName ){
	Role.findOne({ where: { name: roleName } }, 
		function(err, theRole){
			if ( theRole ){
				console.log('Already exist an "'+roleName+'" role');
				roleMappingGetOrCreateAndAssign( user, theRole );
			}else{
				Role.create({ name: roleName }, function(err, role) {
					if (err) return console.log(err);
					console.log('Created role "'+roleName+'"');
					roleMappingGetOrCreateAndAssign(user, role);
				});
			}	
		});
};


var roleMappingGetOrCreateAndAssign = function( user, role ){
	RoleMapping.findOne({ where: { principalId: ''+user.id, roleId: ''+role.id } }, 
		function(err, theRoleMapping){
			if( theRoleMapping ){
				return console.log('User '+user.username+' already has '+role.name+' role.');
			}else{
				role.principals.create({
					principalType: RoleMapping.USER,
					principalId: user.id
				}, function(err, principal) {
					if (err) return console.log(err);
					console.log(' Role "'+role.name+'"assigned to:'+user.username );
				});

			}	
		});	
};



var builtInUsers = [
{
	username: 'docBrown', 
	email: 'admin@admin.admin', 
	password: 'adminpass',
	roles: ['admin']
}
];



process.on('bootRolesCreationEnded', function(){ 
	_.forEach( builtInUsers, function( userToCreate ){
		createUser( userToCreate );
	});
});




function getRoleCreationPermissions( userRoles ){

	var role2RoleCreatePermissions = {
		'admin': ['admin','principal','coordinator','teacher','student'],
			'principal': [ 'teacher','student' ], // 'coordinator',
			'coordinator': ['teacher','student'],
			'teacher': [],
			'student': []
		};

		var allowedRoles = [];

		_.forEach( userRoles, function( role ){ 

			allowedRoles = allowedRoles.concat( role2RoleCreatePermissions[role] || []);

		}); 

		allowedRoles = _.uniq(allowedRoles);

		return allowedRoles;

	};



	var getPersonByDni = function( dni, sucCb, failCb ){

		Person.findOne( { where: { dni: dni } }, 
			function(err, thePerson ){

				if(err){
					if( _.isFunction(failCb)){
						failCb( err );
					};
					return;
				};

				if( !thePerson  ){
					if( _.isFunction(failCb)){
						failCb();
					};
					return;
				} else {
					if( _.isFunction(sucCb)){
						sucCb( thePerson );
					};
					return;
				};
			}
			);
	};




	// Person.upsert( {
	// 	firstName: 'oki',
	// 	fullName: 'ggg',
	// 	dni: 123
	// }, function(err, person){

	// 	if(err){

	// 		console.error( 'Error creating person:', err );
	// 		return;

	// 	};

	// 	console.log( 'Created person ' + person );


// });


 //theUser.accessTokens.destroyAll( function(){} );

//  "password": "$2a$10$wGm1ytPDOrweAMCun0i5y.7zP7GS3zcEDPb8l0ozW7enF2/D4HFIm",

// User.findById('55baa77bcb9cdd8f07bfb45b', function(err, user) {
// 	if (err) return console.error('error ur 1:', err);
// 	user.updateAttribute('password', 'demopass', function(err, user) {
// 		if (err) return console.error('error ur 2:', err);
// 		console.log('> password reset processed successfully');

// 	});
// });


User.changePassword = function( accessTokenId, newPassword, newPasswordConfirmation, cb ){

	
	var AccessToken = app.models.AccessToken;

	AccessToken.findById(accessTokenId, function(err, theAccessToken){

		var errorResponse;
		
		if ( err || !theAccessToken ){
			errorResponse = new Error('Authorization required');
			errorResponse.statusCode = 401;
			return cb( errorResponse );
		};

		if ( !newPassword || !newPasswordConfirmation ) {
			errorResponse = new Error('Missing Data: [newPassword] & [newPasswordConfirmation] are required');
			errorResponse.statusCode = 400;
			errorResponse.code = 'CHANGE_PASS_MISSING_DATA';
			return cb( errorResponse );
		};

		if ( newPassword.length && newPassword.length < 8 ) {
			errorResponse = new Error('Password is too short');
			errorResponse.statusCode = 400;
			errorResponse.code = 'CHANGE_PASS_TOO_SHORT';
			return cb( errorResponse );
		};

		if ( newPassword !== newPasswordConfirmation) {
			errorResponse = new Error('Passwords do not match');
			errorResponse.statusCode = 400;
			errorResponse.code = 'CHANGE_PASS_UNMATCHING';
			return cb( errorResponse );
		};


		User.findById(theAccessToken.userId, function(err, user) {

			if ( err ){
				return cb( err );
			};

			user.updateAttribute('password', newPassword, function(err, user) {

				if ( err ){
					return cb( err );
				};

				var response = {
					status: 1,
					msg: 'Pasword reset processed successfully'
				};

				User.logout( theAccessToken.id, function( err ){

					if ( err ){
					};

					return cb( null, response );
				});	
			});
		});
	});
};

User.remoteMethod( 'changePassword', {
	accepts: [
	{arg: 'accessTokenId', type: 'string' },
	{arg: 'newPassword', type: 'string' },
	{arg: 'newPasswordConfirmation', type: 'string' }
	],
	returns: { root: true, type: 'object' },
	http: {verb: 'post', path: '/change_password' },
	description: 'Reset user password'
});



User.on('resetPasswordRequest', function (info) {

	var mail = { to: info.email };
	var accessToken = info.accessToken.id;

	var fCSettings = app.get('fCSettings') || {};

	var transactionalEmails = fCSettings.transactionalEmails || {};
	var developmentTestEmail_to =  fCSettings.developmentTestEmail_to;
	var developmentTestEmail_from =  fCSettings.developmentTestEmail_from;
	var webhost = fCSettings.webhost;
	var resetUrl = webhost + '/#/account/change_password/' + accessToken;

	mail.from = transactionalEmails.from || '';
	mail.subject = fCSettings.appName + 'Cambio de contraseña';
	mail.html = 
	'<h4><strong>' + fCSettings.appName +'</strong> Cambio de contraseña</h4>' +
	'<p>Puedes crear una nueva contraseña de usuario para tu cuenta, haciendo click en el siguiente enlace:</p>'+
	'<p></p>'+
	'<p><a href="'+ resetUrl +'">Crear una nueva contraseña</a></p>';

	mail.text = 'Para cambiar su contraseña en nuestro servicio, por favor ingrese a esta dirección: '+ resetUrl;


	// Dev overwite
	var env = process.env.NODE_ENV || 'dev';
	if( env !== 'production'){
  		//process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
  		mail.to = developmentTestEmail_to;
  		mail.from = developmentTestEmail_from;
  	};

  	mail.options = {
  		// tls: {rejectUnauthorized:  false} 
  	};

  	

  	MailRepo.create({
  		to: mail.to,
  		from: mail.from,
  		subject: mail.subject,
  		textBody: mail.text,
  		htmlBody: mail.html,
  		status: 'sending',
  		communicationCode: 'TRANS_RESET_PASS',
  		created: Date.now()
  	}, function( err, mailRepoLine){ 
  		if( err ){
  			return;
  		};
  		Email.send( mail, function(err, mail) { 
  			//console.log( err, mail )
  			var status = 'sent';
  			if(err){
  				status = 'err';
  			};
  			mailRepoLine.updateAttributes( { 
  				status: status, 
  				mailerResponse: { err: err, mail: mail }
  			}, function(err){});
  		});
  	});
  });

};




