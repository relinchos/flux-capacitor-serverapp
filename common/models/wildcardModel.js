module.exports = function(WildcardModel) {

	// WildcardModel.beforeCreate = function(next, modelInstance) {

	// 	console.log('---------');

	// 	console.log('WildcardModel instance created:', modelInstance);

	// 	next();
	// };



	
  // This property is used for checking if authentication key is valid on client.
  // Works through ACLS in wildcardModel.json 
	WildcardModel.checkTokenValidity = function(cb) {
      cb(null, 'true');
    };

     
    WildcardModel.remoteMethod(
        'checkTokenValidity', 
        {
          returns: {arg: 'isValid', type: 'string'}
        }
    );

};
