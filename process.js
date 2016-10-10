const rp = require('request-promise');
const cheerio = require('cheerio');
const _ = require('lodash');
const Promise = require('bluebird');
const firebase = require('firebase');
const assert = require('assert');

firebase.initializeApp({
  databaseURL: 'https://clickthecity-movie-scraper.firebaseio.com',
  serviceAccount: './service.account.json'
});

(()=>{
    'use strict';

    Promise.coroutine(function*(){
        try{
            const promises = {};
            const regions = yield firebase.database().ref('regions').once('value');

            console.log(regions.val());
            _.each(regions.val(), (val, location)=>{
                console.log(`Processing regions in ${location}`);
                _.each(val, (val2, region)=>{
                    console.log(`----Processing theatres in ${region}`);
                    _.each(val2.theaters, (url_suffix, theatre)=>{
                        console.log(`========Processing theatre: ${theatre}`);
                        promises[theatre] = getTheatreSchedule(`http://www.clickthecity.com/movies/${url_suffix}`);
                    });
                });
            });

            const results = yield Promise.props(promises);
            console.log(results);
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
                    const movieSchedule = $(li).find('ul').first();

                    resolve({
                        cinemaName,
                        schedule: parseOutSchedule(movieSchedule)
                    });
                });
            })();
        })
    }

    function parseOutSchedule(movieSchedule){
        let $ = cheerio.load(movieSchedule);
        if($(movieSchedule).children().length){
            return parseMovieHtml(movieSchedule);
        }else{
            return {};
        }
    }

    function parseMovieHtml(movieHtml){
        let $ = cheerio.load(movieHtml);

        let mainSpan = $(movieHtml).find('span');

        let title = $(movieHtml).find('a').text();
        let rating = $(mainSpan).find('span').first().find('span').first().text();
        let running_time = $(mainSpan).find('.running_time').text();
        let schedule = $(mainSpan).find('div').text();

        let returnObj = {
            title, rating, running_time, schedule
        }
    }
})();
