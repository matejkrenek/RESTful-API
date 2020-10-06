
/*
* Request handlers
* 
*/

// Dependencies

var _data = require('./data');
var helpers = require('./helpers')
var config = require('./config');
const { time } = require('console');



// Define our handlers
var handlers = {};

// Ping handler
handlers.ping = function(data, callback){
    callback(200);
};

// Not found handler
handlers.notFound = function(data, callback){
    callback(404, {"Error": "Not Found"});
};

// Users handler
handlers.users = function(data, callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data, callback);
    } else{
        callback(405);
    }
};

// Container for the users submethods
handlers._users = {}

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function(data, callback){
    // Check that all required fields are filled out
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 9 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if(firstName && lastName && phone && password && tosAgreement){
        // Make sure that the user doesnt already exist
        _data.read('users', phone, function(err, data){
            if(err){
                // Hash the password
                var hashedPassword = helpers.hash(password)

                // Create the user objet
                if(hashedPassword){
                    var userObject = {
                        'firstName' : firstName,
                        'lastName' : lastName,
                        'phone' : phone,
                        'hashedPassword' : hashedPassword,
                        'tosAgreement' : true
                    };
    
                    // Store the user
                    _data.create('users', phone, userObject, function(err){
                        if(!err){
                            callback(200);
                        } else{
                            console.log(err)
                            callback(500, {'Error': 'Could not create the new user'});
                        }
                    });
                } else{
                    callback(500, {'Error': 'Could not hash the user\'s password'});
                }


            } else{
                // User already exists
                callback(400, {'Error' : 'User with that phone number already exist'})
            }
        });
    } else{
        callback(400, {'Error' : 'Missing required fields'})
    }
};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function(data, callback){
    // Check that the phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 9 ? data.queryStringObject.phone.trim() : false;
    if(phone){

        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid for the phone number
        handlers._tokens.varifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                // Lookup the user
                _data.read('users', phone, function(err, data){
                    if(!err && data){
                        // Remove the hashed password from the user object before returning it to the request
                        delete data.hashedPassword;
                        callback(200, data);
                    } else {
                        callback(404)
                    }
                });
            } else{
                callback(403, {'Error': 'Missing required token is header, or token is invalid'})
            }
        })

    } else{
        callback(400, {'Error' : 'Missing required field'});
    }
};

// Users - put
// Required data : phone
// Optional data : firstName, lastName, password (at least one must be specified)
handlers._users.put = function(data, callback){
    // Check for the required fields
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 9 ? data.payload.phone.trim() : false;

    // Check for the optional fields
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    // Error if the phone is invalid
    if(phone){
        // Error if nothing is sent to update
        if(firstName || lastName || password){

            // Get the token from the headers
            var token = typeof(data.headers.token) == 'string' ? data.headers.token : false


            // Verify that the given token is valid for the phone number
            handlers._tokens.varifyToken(token, phone, function(tokenIsValid){
                if(tokenIsValid){
                    // Lookup the user
                    _data.read('users', phone, function(err, userData){

                        if(!err && userData){
                            // Update the fields necessary
                            if(firstName){
                                userData.firstName = firstName;
                            }
                            if(lastName){
                                userData.lastName = lastName;
                            }
                            if(password){
                                userData.hashedPassword = helpers.hash(password);
                            }

                            // Store the new updates
                            _data.update('users', phone, userData, function(err){
                                if(!err){
                                    callback(200);
                                } else {
                                    callback(500, {'Error': 'Could not update the user'});
                                }
                            })
                        } else{
                            callback(400, {'Error': 'The specified user does not exist'});
                        }
                    })

                } else{
                    callback(403, {'Error': 'Missing required token is header, or token is invalid'})
                }
            });
        } else{
            callback(400, {'Error': 'Missing fields to update'})
        }
    } else {
        callback(400, {'Error': 'Missing required field'})
    }

};

// Users - delete
// Required field : phone
handlers._users.delete = function(data, callback){
    // Check that the phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 9 ? data.queryStringObject.phone.trim() : false;
    if(phone){

        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false


        // Verify that the given token is valid for the phone number
        handlers._tokens.varifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                // Lookup the user
                _data.read('users', phone, function(err, userData){
                    if(!err && userData){
                        _data.delete('users', phone, function(err){
                            if(!err){
                                // Delete each of the checks associated with the user
                                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                var checksToDelete = userChecks.length;
                                if(checksToDelete > 0){
                                    var checksDeleted = 0;
                                    var deletionErrors = false;
                                    // Loop through the checks
                                    userChecks.forEach(function(checkId){
                                        // Delete the check
                                        _data.delete('checks', checkId, function(err){
                                            if(err){
                                                deletionErrors = true
                                            }
                                            checksDeleted++;
                                            if(checksDeleted == checksDeleted){
                                                if(!deletionErrors){
                                                    callback(200)
                                                }else{
                                                    callback(500, {'Error': 'Errors encounterd while attempting to delete all of the user\'s checks. All checks may not have been deleted successfuly'});
                                                }
                                            }
                                        })
                                    })
                                } else{
                                    callback(200);
                                }

                            } else{
                                callback(500, {'Error': 'Could not delete the specified user'});
                            }
                        })
                    } else {
                        callback(400, {'Error': 'Could not find the specified user'});
                    }
                });
            } else{
                callback(403, {'Error': 'Missing required token is header, or token is invalid'})

            }
        });
    } else{
        callback(400, {'Error' : 'Missing required field'});
    }
};

handlers.tokens = function(data, callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data,callback);
    } else{
        callback(405)
    }
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data, callback){
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 9 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone && password){
        // Lookup the user who matches that phone number
        _data.read('users', phone, function(err, userData){
            if(!err && userData){
                // Hash the sent password, and compare it to the password stored in the user object
                var hashedPassword = helpers.hash(password);
                if(hashedPassword == userData.hashedPassword){
                    // If valid, create a new token with a random name. Set expiration date 1hour in the future
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;
                    var tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    }

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, function(err){
                        if(!err){
                            callback(200, tokenObject)
                        } else{
                            callback(500, {'Error': 'Could not create the new token'})
                        }
                    })



                } else{ 
                    callback(400, {'Error': 'Password did not match the specified user\'s stored password'})
                }
            } else{
                callback(400, {'Error': 'Could not find the specified user'});
            }
        })
        // 


    } else {
        callback(400, {'Error': 'Missing required field(s)'})
    }
};

// Tokens - get
// Required data : id
// Optional data : none
handlers._tokens.get = function(data, callback){
    // Check that the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // Lookup the token
        _data.read('tokens', id, function(err, tokenData){
            if(!err && tokenData){
                callback(200, tokenData);
            } else {
                callback(404)
            }
        });
    } else{
        callback(400, {'Error' : 'Missing required field'});
    }
};

// Tokens - put
// Required data : id, extend
// Optional data : none 
handlers._tokens.put = function(data, callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;


    if(id && extend){
        // Lookup the token
        _data.read('tokens', id, function(err, tokenData){
            if(!err && tokenData){
                // Check to make sure the token isn't already expired
                if(tokenData.expires > Date.now()){
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    // Store the new updates
                    _data.update('tokens', id, tokenData, function(err){
                        if(!err){
                            callback(200)
                        } else{
                            callback(500, {'Error': 'Could not update the token\'s expiration'})
                        }
                    }); 

                } else {
                    callback(400, {'Error': 'The token has already expires, and cannot be extended'})
                }
            } else{
                callback(400, {'Error': 'Specified token does not exist'})
            }
        });

    } else {
        callback(400, {'Error' : 'Missing required field(s) or field(s) are invalid'})
    }

};

// Tokens - delete
// Required data : id
// Optinal data : none
handlers._tokens.delete = function(data, callback){
    // Check that the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // Lookup the token
        _data.read('tokens', id, function(err, data){
            if(!err && data){
                _data.delete('tokens', id, function(err){
                    if(!err){
                        callback(200)
                    } else{
                        callback(500, {'Error': 'Could not delete the specified token'});
                    }
                })
            } else {
                callback(400, {'Error': 'Could not find the specified token'});
            }
        });
    } else{
        callback(400, {'Error' : 'Missing required field'});
    }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.varifyToken = function(id, phone, callback){
    // Lookup the token
    _data.read('tokens', id, function(err, tokenData){
        if(!err && tokenData){
            // Check that the token is for the given user and has not expired
            if(tokenData.phone == phone && tokenData.expires > Date.now()){
                callback(true)
            } else{
                callback(false)
            }
        } else{
            callback(false)
        }
    })
}

// Checks handler
handlers.checks = function(data, callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._checks[data.method](data, callback);
    } else{
        callback(405);
    }
};

// Container for all the checks methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = function(data, callback){
    // Validate all the inputs
    var protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if(protocol && url && method && successCodes && timeoutSeconds){
        // Get the token from the  headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Lookup the user by reading the token
        _data.read('tokens', token, function(err, tokenData){
            if(!err && tokenData){
                var userPhone = tokenData.phone

                //Lookup the user data
                _data.read('users', userPhone, function(err, userData){
                    if(!err && userData){
                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // Verify that the user has less than the number of max-checks-per-user
                        if(userChecks.length < config.maxChecks){
                            // Create a random id for the check
                            var checkId = helpers.createRandomString(20)

                            // Create the check object and include the user's phone
                            var checkObject = {
                                'id': checkId,
                                'userPhone': userPhone,
                                'protocol': protocol,
                                'url': url,
                                'method': method,
                                'successCodes': successCodes,
                                'timeoutSeconds': timeoutSeconds
                            };

                            // Save the object
                            _data.create('checks', checkId, checkObject,function(err){
                                if(!err){
                                    // Add the check id to the user's object
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    // Save the new user data
                                    _data.update('users', userPhone, userData, function(err){
                                        if(!err){
                                            // Return  the data about the new check
                                            callback(200, checkObject)
                                        } else{
                                            callback(500, {'Error' : 'Could not update the user with the new check'})
                                        }
                                    })
                                } else{
                                    callback(500, {'Error': 'Could not create the new check'})
                                }
                            })
                        } else{
                            callback(400, {'Error': 'The user already has the maximum number of checks ('+config.maxChecks+')'})
                        }
                    } else{
                        callback(403)
                    }
                })

            } else{
                callback(403)
            }
        })

    } else{
        callback(400, {'Error': 'Missing required inputs, or inputs are invalid'});
    }
}

// Checks - get
// Required data : id
// Optional data : none
handlers._checks.get = function(data, callback){
    // Check that the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        
        // Lookup the check
        _data.read('checks', id, function(err, checkData){
            if(!err && checkData){
                // Get the token from the headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                // Verify that the given token is valid and belongs to the user who created the check
                handlers._tokens.varifyToken(token, checkData.userPhone, function(tokenIsValid){
                    if(tokenIsValid){
                        // Return the check data
                        callback(200, checkData)
                    } else{
                        callback(403)
                    }
                })
            } else{
                callback(404);
            }
        })



    } else{
        callback(400, {'Error' : 'Missing required field'});
    }
};

// Checks - put
// Required data : id
// Optional data : protocol, url, method, successCodes, timeoutSeconds (one must be sends)
handlers._checks.put = function(data,callback){
    // Check for required field
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  
    // Check for optional fields
    var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
  
    // Error if id is invalid
    if(id){
      // Error if nothing is sent to update
      if(protocol || url || method || successCodes || timeoutSeconds){
        // Lookup the check
        _data.read('checks',id,function(err,checkData){
          if(!err && checkData){
            // Get the token that sent the request
            var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            // Verify that the given token is valid and belongs to the user who created the check
            handlers._tokens.varifyToken(token,checkData.userPhone,function(tokenIsValid){
              if(tokenIsValid){
                // Update check data where necessary
                if(protocol){
                  checkData.protocol = protocol;
                }
                if(url){
                  checkData.url = url;
                }
                if(method){
                  checkData.method = method;
                }
                if(successCodes){
                  checkData.successCodes = successCodes;
                }
                if(timeoutSeconds){
                  checkData.timeoutSeconds = timeoutSeconds;
                }
  
                // Store the new updates
                _data.update('checks',id,checkData,function(err){
                  if(!err){
                    callback(200);
                  } else {
                    callback(500,{'Error' : 'Could not update the check.'});
                  }
                });
              } else {
                callback(403);
              }
            });
          } else {
            callback(400,{'Error' : 'Check ID did not exist.'});
          }
        });
      } else {
        callback(400,{'Error' : 'Missing fields to update.'});
      }
    } else {
      callback(400,{'Error' : 'Missing required field.'});
    }
  };

// Checks - delete
// Required data : id
// Optional data : none
handlers._checks.delete = function(data, callback){
    // Check that the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // Lookup the check
        _data.read('checks', id, function(err, checkData){
            if(!err && checkData){
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                handlers._tokens.varifyToken(token, checkData.userPhone, function(tokenIsValid){
                    if(tokenIsValid){
                        // Delete the check data
                        _data.delete('checks', id, function(err){
                            if(!err){
                                // Lookup the user
                                _data.read('users', checkData.userPhone, function(err, userData){
                                    if(!err && userData){
                                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                                        // Remove the deleted check from their list of checks
                                        var checkPosition = userChecks.indexOf(id);
                                        if(checkPosition > -1){
                                            userChecks.splice(checkPosition, 1);
                                            // Re-save the user's data
                                            _data.update('users', checkData.userPhone, userData, function(err){
                                                if(!err){
                                                    callback(200)
                                                } else{
                                                    callback(500, {'Error': 'Could not update the user'})
                                                }
                                            })
                                        } else {
                                            callback(500, {'Error': 'Could not find the check on the user object'})
                                        }
                                    } else {
                                        callback(500, {'Error': 'Could not find the user who created the check, so could not remove the check from the list of the user object'});
                                    }
                                });

                            } else {
                                callback(500, {'Error': 'Could not delete the check data'})
                            }
                        })

                        
                    } else{
                        callback(403)
        
                    }
                });
            } else{
                callback(400, {'Error': 'The specified check ID does not exist'} )
            }
        })
    } else{
        callback(400, {'Error' : 'Missing required field'});
    }
};

// Export the module
module.exports = handlers