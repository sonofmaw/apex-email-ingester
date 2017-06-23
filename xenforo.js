const request = require('request');
const xenForoUrl = "http://apexracinguk.com/forums/api.php";

const API_KEY = process.env.XENFORO_API_KEY;
const THREAD_ID = 3841;
    
function postMessage(id, message, callback) {
    request.get(xenForoUrl, {
        qs: {
            hash: API_KEY,
            action: "createpost",
            thread_id: THREAD_ID,
            grab_as: "ApexRacingTV",
            message,
        }
    }, (err, res) => {
        if (err) {
            return callback(err);
        }

        if (res.statusCode !== 200) {
            return callback(new Error('Failed request: ' + res.body));
        }

        callback(null);
    });
}

module.exports = { postMessage };