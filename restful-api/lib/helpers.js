/*
* Helpers for various tasks
*
*/

// Dependencies
var crypto = require('crypto');
const { type } = require('os');
var config = require('./config');

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






// Export a module
module.exports = helpers;