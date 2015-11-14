module.exports = function(WildcardModel) {

  // WildcardModel.beforeCreate = function(next, modelInstance) {

  //  console.log('---------');

  //  console.log('WildcardModel instance created:', modelInstance);

  //  next();
  // };



  
  // This property is used for checking if authentication key is valid on client.
  // Works through ACLS in wildcardModel.json 
  WildcardModel.checkSessionValidity = function(cb) {
    cb(null, 'true');
  };


  WildcardModel.remoteMethod(
    'checkSessionValidity', 
    {
      returns: { root: true, type: 'boolean' },
      description: 'Check if current session access token is authenticated or not'
    }
    );



    
  WildcardModel.checkTokenValidity = function(accessToken, cb) {

    var app = WildcardModel.app;
    var AccessToken = app.models.AccessToken;
    

    AccessToken.findById( accessToken, function( err, theAccessToken){ 
      if(err){
        return cb(err);
      };

      if(!theAccessToken){
        return cb(null, { isValid: false } );
      };

      theAccessToken.validate(function(err, isValid) {
        if(err){
          return cb(err);
        };
        return cb( null, { isValid: isValid } );
      });
    });
  };


  WildcardModel.remoteMethod(
    'checkTokenValidity', 
    {
     accepts: [
     {arg: 'accessToken', type: 'string' }
     ],
     returns: { root: true, type: 'object' },
     http: {verb: 'get', path: '/check_token_validity' },
     description: 'Check if given acces token is valid or not'
   }
   );

};
