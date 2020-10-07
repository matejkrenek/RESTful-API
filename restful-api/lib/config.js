/*
* Create and export configuration variables
*
*/

// Container for all the environments
var environments = {};

// Staging (defualt) environment
environments.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'envName': 'staging',
    'hashingSecret' : 'thisIsASecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'AC65089c7561b6c24349bf2c3d0a39ae33',
        'authToken': '1249904251b2a374efa833cc3c63eaa5',
        'fromPhone': '+420737088785'
    }

};

// Production environment
environments.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName': 'production',
    'hashingSecret' : 'thisIsAlsoASecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid': '',
        'authToken': '',
        'fromPhone': ''
    }
};

// Determine which envirnment was passed as a command-line argumnet
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environment above, if not, defualt to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;

