const AWS = require('aws-sdk');
const fs = require('fs');
var secretConfig = require('../secret-config');

function getPolly() {
    AWS.config = new AWS.Config();
    AWS.config.accessKeyId = secretConfig.AWS_ACCESS_KEY_ID;
    AWS.config.secretAccessKey = secretConfig.AWS_SECRET_ACCESS_KEY;
    AWS.config.region = "us-east-1";

    const Polly = new AWS.Polly();
}

module.exports = {
    getPolly,
    default: {
        getPolly
    }
};