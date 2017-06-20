const google = require('./google');
const authorisation = require('./authorisation');
const xenoforo = require('./xenforo');
const fs = require('fs');

const STATE_PATH = './last-message.json';

function reversed(a, b) {
    return a - b;
}

function checkMessages(auth, state, callback) {
    google.recentMessages(auth, null, (messages) => {
        let ids = messages
            .map(message => message.id)
            .filter(id => id > state.lastMessageId)
            .sort();

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            google.getMessage(auth, id, messageContent => {
                xenforo.postMessage(id, messageContent);

                writeState({
                    lastMessageId: id
                });
            });
        }
    });
}

function writeState(state) {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state), 'utf-8');
}

authorisation.getAuthorization(auth => {
    // Read the persisted last message
    if (!fs.existsSync(STATE_PATH)) {
        checkMessages(auth, {
            lastMessageId: 0
        });
    } else {
        fs.read(STATE_PATH, 'utf-8', state => {
            checkMessages(auth, JSON.parse(state));
        });
    }
});
