var escape = require('escape-html');
var google = require('googleapis');

function atob(str) {
    return new Buffer(str, 'base64').toString('binary');
}

function decode(string) {
    return decodeURIComponent(escape(atob(string.replace(/\-/g, '+').replace(/\_/g, '/'))));
}

function getText(response) {
    var result = '';
    var parts = [response.payload];

    while (parts.length) {
        var part = parts.shift();
        if (part.parts) {
            parts = parts.concat(part.parts);
        }
        if (part.mimeType === 'text/plain') {
            result = decode(part.body.data);
            break;
        }
    }

    return result;
}

function recentMessages(auth, query, cb) {
    var gmail = google.gmail('v1');

    gmail.users.messages.list({
        auth,
        userId: 'me',
        maxResults: 10
    }, function (err, resp) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        
        cb(resp.messages);
    });
}

function getMessage(auth, id, cb) {
    var gmail = google.gmail('v1');

    gmail.users.messages.get({
        auth,
        id,
        userId: 'me'
    }, function (err, resp) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }

        let message = {};
        resp.payload.headers.forEach(h => {
            message[h.name] = h.value;
        });
        message.Body = getText(resp);
        
        cb(message);
    }
}

module.exports = {
    recentMessages,
    getMessage
};