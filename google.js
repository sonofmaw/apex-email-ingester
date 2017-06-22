const escape = require('escape-html');
const google = require('googleapis');

function atob(str) {
    return new Buffer(str, 'base64').toString('binary');
}

function decode(string) {
    return decodeURIComponent(escape(atob(string.replace(/\-/g, '+').replace(/\_/g, '/'))));
}

function getText(response) {
    let result = '';
    let parts = [response.payload];

    while (parts.length) {
        let part = parts.shift();
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
    // @ts-ignore
    const gmail = google.gmail('v1');

    gmail.users.messages.list({
        auth,
        userId: 'me'
    }, (err, resp) => {
        if (err) {
            return cb(err);
        }

        cb(null, resp.messages);
    });
}

function getMessage(auth, id, cb) {
    // @ts-ignore
    const gmail = google.gmail('v1');

    gmail.users.messages.get({
        auth,
        id,
        userId: 'me'
    }, (err, resp) => {
        if (err) {
            return cb(err);
        }

        let message = {};
        resp.payload.headers.forEach(h => {
            message[h.name] = h.value;
        });
        message.Body = getText(resp);

        cb(null, message);
    });
}

module.exports = {
    recentMessages,
    getMessage
};
