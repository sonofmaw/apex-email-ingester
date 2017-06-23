const google = require('./google');
const authorisation = require('./authorisation');
const xenforo = require('./xenforo');
const fs = require('fs');
const cron = require('node-cron');
const gutil = require('gutil');

const STATE_PATH = './last-message.json';

function reportError(err) {
    if (err) {
        gutil.error(err);
    }
}

const formatMessage = messageContent => (
`From: ${messageContent.From}
Subject: ${messageContent.Subject}
Received: ${messageContent.Received}

${messageContent.Body}
`);

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

                if (!process.env.FAKE_XENFORO) {
                    xenforo.postMessage(id, formatMessage(messageContent), err => {
                        if (err) {
                            return callback(err);
                        }

                        gutil.log("Posted message ", messageContent.Subject);
                    
                        writeState({
                            lastMessageId: id
                        });

                        fetchAndPost(index + 1);
                    });
                } else {
                    gutil.log("Would have posted message: ", formatMessage(messageContent));
                    setTimeout(() => fetchAndPost(index + 1), (Math.random() * 3000) + 500);
                }
            });
        }

        if (ids.length === 0) {
            gutil.info("No new messages");
            return callback();
        }

        fetchAndPost(0);
    });
}

function writeState(state) {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state), 'utf-8');
}


cron.schedule('*/15 * * * *', () => {
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
}, true);    
