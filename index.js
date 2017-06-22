const google = require('./google');
const authorisation = require('./authorisation');
const xenforo = require('./xenforo');
const fs = require('fs');

const STATE_PATH = './last-message.json';

function reportError(err) {
    if (err) {
        console.error(err);
    }
}

function checkMessages(auth, state, callback) {
    google.recentMessages(auth, null, (err, messages) => {
        if (err) {
            return reportError(err);
        }

        let ids = messages
            .map(message => message.id)
            .filter(id => id > state.lastMessageId);
        ids.sort();

        function fetchAndPost(index) {
            if (index >= ids.length) {
                return callback();
            }
            
            const id = ids[index];

            google.getMessage(auth, id, (err, messageContent) => {
                if (err) {
                    return reportError(err);
                }

                xenforo.postMessage(id, messageContent, err => {
                    if (err) {
                        return callback(err);
                    }

                    console.log("Posted message ", messageContent.Subject);                    
                    
                    writeState({
                        lastMessageId: id
                    });

                    fetchAndPost(index + 1);
                });
            });
        }

        if (ids.length === 0) {
            console.info("No new messages");
            return callback();
        }

        fetchAndPost(0);
    });
}

function writeState(state) {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state), 'utf-8');
}

authorisation.getAuthorization(auth => {
    // Read the persisted last message
    if (!fs.existsSync(STATE_PATH)) {
        checkMessages(auth, {
            lastMessageId: ""
        }, reportError);
    } else {
        fs.readFile(STATE_PATH, 'utf-8', (err, state) => {
            if (err) {
                return reportError(err);
            }
            checkMessages(auth, JSON.parse(state), reportError);
        });
    }
});
