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
	}
	);


 






	//User.settings.properties.algo = 'string';

	//console.log('.............', User.settings, '............');
	
	
	User.beforeRemote('login', function(ctx, user, next) {

		if( app.settings['login_emailVerificationRequired'] ) {
			var userEmail = ctx.req.body.email;
			User.findOne({ where: { email: userEmail }}, function(err, user) { 
				if( user && !user.emailVerified && !err ){
					ctx.res.status(401).send({ errorReason: 'needVerification' });
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
						ctx.res.status(200).send( modifiedResponse );
					}
				},
				function( err ){ 
					ctx.res.status(500).send( err ) 
				});
		});
	});

	User.afterRemote('findOne', function(ctx, userData, next) {

		var editableUserData =  _.pick( userData.toJSON() , _.identity);

		getUserRoles( 
			userData.id , 
			function( resposeArray ){ 
				editableUserData.roles = resposeArray;
				ctx.res.status(200).send( editableUserData );
			},
			function( err ){ 
				ctx.res.status(500).send( err ) 
			}
			);

	});

	

	User.afterRemote('login', function(ctx, newSession, next) {

		//var _ = require('lodash');

		var editableResponse =  newSession.toJSON();

		console.log('logged newSession:', editableResponse );

		var editableUserData        = editableResponse.user 
		var editableUserData__clean = _.pick( editableUserData , _.identity); // without properties with "falsey" value

		var editableResponse__clean = editableResponse;
		editableResponse__clean.user = editableUserData__clean;
		editableResponse__clean = _.pick( editableResponse__clean  , _.identity) ; // without properties with "falsey" value 
		
		setTimeout(function(){
			
			// get user rles
			getUserRoles( 
				editableResponse.user.id , 
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




					ctx.res.status(200).send( editableResponse__clean );
				},
				function( err ){ 
					ctx.res.status(500).send( err ) 
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

		console.log('theRoleMapping', theRoleMapping)

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




	// User.beforeCreate = function(next, modelInstance) {
	// 	next();
	// };

	

	User.afterCreate = function( next ) {
		if( app.settings['signup_autoSendVerification']){
			
			var userCreated = this;
			var options = {
				type: 'email',
				to: userCreated.email,
				from: 'noreply@myapp.com',
				subject: 'Thanks for Registering at FooBar'
			};

			userCreated.verify(options, next);
		};
	};






	var createUser = function( userToCreate ){
		User.findOne( { where: { username: userToCreate.username } }, 
			function(err, theUser){
				if(err){
					console.log(err);
					return;
				}
				console.log('\n---------------------------------------');
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
		username: 'doc', 
		email: 'demoadmin@demohost.demo', 
		password: 'demopass',
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

	}


// Person.create({ firstName: 'Albert', lastName: 'Einstein' }, function(err,person){
// 	console.log('person......', person );

// 	console.log('changed something here?');

// });


 //theUser.accessTokens.destroyAll( function(){} );


};



