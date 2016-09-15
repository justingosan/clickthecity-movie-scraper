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
            let regions = yield firebase.database().ref('regions').once('value');

            // _.each(regions.val())

        }catch(e){
            throw e;
        }
    })();

    function getSchedule(url){
        return new Promise((resolve, reject)=>{
            Promise.coroutine(function*(){
                try{


                }catch(e){
                    resolve({});
                }
            })();
        })
    }
})();
