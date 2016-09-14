const rp = require('request-promise');
const cheerio = require('cheerio');
const _ = require('lodash');
const Promise = require('bluebird');
const firebase = require('firebase');
const assert = require('assert');

firebase.initializeApp({
  databaseURL: 'https://clickthecity-movie-scraper.firebaseio.com',
  serviceAccount: './serviceAccount.json'
});

(()=>{
    'use strict';

    Promise.coroutine(function*(){
        try{
            getTheatreSchedule('http://www.clickthecity.com/movies/theaters/sm-megamall');
        }catch(e){
            throw e;
        }
    })();

    function getTheatreSchedule(url){
        return new Promise((resolve, reject)=>{
            Promise.coroutine(function*(){
                const response = yield rp({
                    url: url
                });
                const $ = cheerio.load(response);

                const theatersArea = $('div#theatersArea');

                // get date
                try{
                    const partialDate = $(theatersArea).find('div').first().text().split(', ')[1];
                }catch(e){
                    throw('Could not parse out date');
                }

                // iterate over cinema list
                const cinemas = {};
                $(theatersArea).find('ul#cinemas').children().each((i, li)=>{
                    const cinemaName = $(li).find('span.cinema').first().text();
                    const movieSchedule = $('li').find('ul').first();

                    console.log(parseOutSchedule(movieSchedule));
                });
            })();
        })
    }

    function parseOutSchedule(movieSchedule){
        $ = cheerio.load(movieSchedule);

        if($.children().length){

        }else{
            return {};
        }
    }

})();
