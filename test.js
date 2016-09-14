const rp = require('request-promise');
const cheerio = require('cheerio');
const _ = require('lodash');
const Promise = require('bluebird');
const assert = require('assert');
const request = Promise.promisify(require('request'));

Promise.coroutine(function * () {
    console.log('test');

    var options = {
        method: 'GET',
        url: 'http://www.clickthecity.com/movies/theaters.php?cid=10',
        headers: {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
        },
    };

    let response = yield request(options);
    console.log(response);
})();
