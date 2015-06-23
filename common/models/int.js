module.exports = function(Int, server) {

	Int.status = function(cb) {
    
		var status = {};

		status.env = process.env.NODE_env;

		// status.conn = {
		// 	port: server.get('port') || '000'
		// };

		var response = status;


    cb(null, response );
  };

  Int.remoteMethod(
    'status',
    {
      http: {path: '/status', verb: 'get'},
      returns: {arg: 'status', type: 'string'}
    }
  );

};
