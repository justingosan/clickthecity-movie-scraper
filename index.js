const rp = require('request-promise');
const cheerio = require('cheerio');
const _ = require('lodash');
const Promise = require('bluebird');
const firebase = require('firebase');
const assert = require('assert');

// firebase.initializeApp({apiKey: process.env.FIREBASE_API_KEY, authDomain: process.env.AUTH_DOMAIN, databaseURL: process.env.FIREBASE_URL, storageBucket: process.env.BUCKET});
//
// _self.db = firebase.database().ref('challenges');

firebase.initializeApp({
  databaseURL: 'https://clickthecity-movie-scraper.firebaseio.com',
  serviceAccount: './service.account.json'
});

(()=>{
    'use strict';

    Promise.coroutine(function*(){
        try{
            let response = yield rp.get('http://www.clickthecity.com/movies/')
            let $ = cheerio.load(response);

            // grab regions
            const regions=[];
            $('nav#subnav').find('ul').splice(1,2).forEach((ul, idx)=>{
                regions[idx] = {};
                $(ul).find('a').each((i, a)=>{
                    regions[idx][String($(a).text())] = {
                        url: String($(a).attr('href'))
                    }
                });
            });

            const totalLocations = Object.keys(regions[0]).length + Object.keys(regions[1]).length;
            console.log(`Grabbed ${totalLocations} locations`);
            assert(totalLocations > 0, 'There should be more than 1 location');

            const promises = [];
            const tracker = [];
            regions.forEach((region, region_idx)=>{
                _.each(region, (loc, key)=>{
                    promises.push(getCinemasFromLocation(loc.url));
                    tracker.push([region_idx, key]);
                });
            });

            const results = yield Promise.all(promises);
            results.forEach((result, idx)=>{
                regions[tracker[idx][0]][tracker[idx][1]].theaters = result;
            });
            console.log(JSON.stringify(regions));

            yield firebase.database().ref('regions').set({
                metro_manila: regions[0],
                outside: regions[1],
            });
        }catch(e){
            throw e;
        }
    })();


    function getCinemasFromLocation(url){
        return new Promise((resolve, reject)=>{
            Promise.coroutine(function*(){
                try{
                    const $ = yield rp.get({
                        url: 'http://www.clickthecity.com' + url,
                        followAllRedirects: true,
                        timeout: 10000,
                        headers: {
                            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
                        },
                        transform: function (body) {
                            return cheerio.load(body);
                        }
                    });

                    const theatre_list = $('section#maincontent').find('ul')[0];
                    assert(theatre_list !== null);

                    const returnVal = {};
                    $(theatre_list).find('li').each((i, li)=>{
                        let href = $(li).children().first().attr('href');
                        let urlParts =  href.split('/');
                        let name;
                        if(urlParts.length === 2){
                            name = urlParts[1].replace(/-/g, '_');
                        }else{
                            name = urlParts[0].replace(/-/g, '_');
                        }
                        returnVal[name] = href;
                    });

                    console.log(url);
                    console.log(returnVal);

                    resolve(returnVal);
                }catch(e){
                    console.log('Error retrieving: ' + url);
                    resolve({});
                }
            })();
        })
    }


})();
