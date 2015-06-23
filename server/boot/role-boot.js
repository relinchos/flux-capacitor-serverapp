module.exports = function roleBoot(app) {

	var _ = require('lodash');

	// var events = require('events');
	// var eventEmitter = new events.EventEmitter();

	var Role = app.models.Role; 

	Role.validatesUniquenessOf('name');


	// ACL
	Role.settings.acls = Role.settings.acls || [];
	Role.settings.acls.push(
	{ 
		principalType: 'ROLE',
		principalId: 'admin',
		permission: 'ALLOW',
		accessType: 'READ'
	}
	);



	
	

	var createRole = function( newRoleName, cb ){
		Role.findOne({ where: { name: newRoleName } },  function(err, theRole){
			if ( theRole ){
				console.log('Already exist a "'+ newRoleName +'" role.');
				if(_.isFunction(cb)){
					cb();
				};
			}else{
				Role.create({ name: newRoleName }, function(err, role) {
					if (err) return console.log(err);
					console.log('Created role :"'+ newRoleName +'"');
					if(_.isFunction(cb)){
						cb();
					};
				});
			}	
		});
	};



	var generateBuiltInRoles = function(){
		var builtInRoles = [ 
		'admin',
		'principal',
		'coordinator',
		'teacher', 
		'student',
		
		];


		var builtInRoles_LEN = builtInRoles.length;

		if( builtInRoles_LEN ){
			var cont = 0;
			_.forEach( builtInRoles, function( roleToBeCreatedName ){
				createRole( roleToBeCreatedName, function(){
					cont++;
					if( cont >= builtInRoles_LEN ){
						process.emit('bootRolesCreationEnded');
					};
				});
			});
		} else {
			process.emit('bootRolesCreationEnded');
		};
	};


	generateBuiltInRoles(); 

	



}