const http = require('http');

const API_KEY = process.env.XENFORO_API_KEY;

function postMessage(id, messageContent, callback) {
    http.request({

    }, res => {
        if (res.statusCode !== 200) {
            return callback('Failed request', id, messageContent);
        }
        callback(null);
    });
}
