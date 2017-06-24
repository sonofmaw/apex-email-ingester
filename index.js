const google = require('./google');
const authorisation = require('./authorisation');
const xenforo = require('./xenforo');
const fs = require('fs');
const cron = require('node-cron');
const prettyCron = require('prettycron');

const STATE_PATH = './last-message.json';
const CONFIG_PATH = './config.json';

function reportError(err) {
    if (err) {
        console.error(err);
    }
}

let config = {
    schedule: '*/15 * * * *',
    emailAs: 'ApexRacingTV',
    threadId: '3841'
}

if (fs.existsSync(CONFIG_PATH)) {
    config = Object.assign(config, JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')));
}

const formatMessage = messageContent => (
`From: ${messageContent.From}
Subject: ${messageContent.Subject}
Received: ${messageContent.Received}

${messageContent.Body}
`);

function checkMessages(auth, state, callback) {
    console.log("Checking messages");

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

                        console.log("Posted message ", messageContent.Subject);
                    
                        writeState({
                            lastMessageId: id
                        });

                        fetchAndPost(index + 1);
                    });
                } else {
                    console.log("Would have posted message: ", formatMessage(messageContent));
                    setTimeout(() => fetchAndPost(index + 1), (Math.random() * 3000) + 500);
                }
            });
        }

        if (ids.length === 0) {
            console.log("No new messages");
            return callback();
        }

        console.log(ids.length, "new messages");

        fetchAndPost(0);
    });
}

function writeState(state) {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state), 'utf-8');
}

console.log("First check", prettyCron.getNext(config.schedule));

let job = cron.schedule(config.schedule, () => {
    const complete = err => {
        if (err) {
            reportError(err);
            job.stop();
        }

        console.log("Next check", prettyCron.getNext(config.schedule));
    }

    authorisation.getAuthorization(auth => {
        // Read the persisted last message                          
        if (!fs.existsSync(STATE_PATH)) {
            checkMessages(auth, {
                lastMessageId: ""
            }, complete);
        } else {
            fs.readFile(STATE_PATH, 'utf-8', (err, state) => {
                if (err) {
                    return reportError(err);
                }

                checkMessages(auth, JSON.parse(state), complete);
            });
        }
    });
}, true);
