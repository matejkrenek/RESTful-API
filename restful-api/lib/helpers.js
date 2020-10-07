/*
* Helpers for various tasks
*
*/

// Dependencies
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var querystring = require('querystring');

// Container for all the helpers
var helpers = {};


// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str){
    try{
        var obj = JSON.parse(str);
        return obj;
    } catch(e){
        return {};
    }
}


// Create a SHA256 hash
helpers.hash = function(str){
    if(typeof(str) == 'string' && str.length > 0){
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash
    } else{
        return false;
    }
};


// Create a string of random aplphanumeric characterm of a given length
helpers.createRandomString = function(strLength){
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if(strLength){
        // Define all the possible characters that could go into a string
        var possibleCharacter = 'abcdefghijklmnopqrstuvwxyz0123456789';

        // Start the final string
        var str = ''

        for(i = 1; i <= strLength; i++){
            // Get random character from possibleCharascters string
            var randomCharacter = possibleCharacter.charAt(Math.floor(Math.random() * possibleCharacter.length))

            // Append this character to the final string
            str += randomCharacter
        }

        // Return the final string
        return str;
    } else{
        return false
    }
};

// Send an SMS message via Twilio
helpers.sendTwilioSms = function(phone, msg, callback){
    // Validate parametrs
    phone = typeof(phone) == 'string' && phone.trim().length == 9 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
    if(phone && msg){
        // Configure the request payload
        var payload = {
            'From': config.twilio.fromPhone,
            'To': "+420"+phone,
            'Body': msg
        };
        // Stringify the payload
        var stringPayload = JSON.stringify(payload);

        // Configure the request details
        var requestDetails = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers' : {
              'Content-Type' : 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(stringPayload)
            }
          };

        // Instantiate the request object
        var req = https.request(requestDetails, function(res){
            // Grap the status of the sent request
            var status = res.statusCode;

            // Callback successfully if the request went through
            if(status == 200 || status == 201){
                callback(false)
            } else{
                callback('Status code returned was '+status)
            }
        });

        // Bind to the error event so it doesn't get throw
        req.on('error', function(e){
            callback(e)
        })

        // Add the payload
        req.write(stringPayload);

        // End the request
        req.end();


    } else{
        callback('Given paramentrs were missing or invalid')
    }
}




// Export a module
module.exports = helpers;