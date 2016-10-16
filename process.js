require('dotenv').config()

const rp = require('request-promise');
const cheerio = require('cheerio');
const _ = require('lodash');
const Promise = require('bluebird');
const firebase = require('firebase');
const assert = require('assert');

firebase.initializeApp({
  databaseURL: 'https://clickthecity-movie-scraper.firebaseio.com',
  serviceAccount: {
    projectId: "clickthecity-movie-scraper",
    clientEmail: "clickthecity-movie-scraper@appspot.gserviceaccount.com",
    privateKey: new Buffer(process.env.KEY_BASE64, 'base64').toString('ascii')
  },
});

(()=>{
    'use strict';

    Promise.coroutine(function*(){
        try{
            const promises = {};
            const regions = yield firebase.database().ref('regions').once('value');

            _.each(regions.val(), (val, location)=>{
                console.log(`Processing regions in ${location}`);
                _.each(val, (val2, region)=>{
                    console.log(`----Processing theatres in ${region}`);
                    _.each(val2.theaters, (url_suffix, theatre)=>{
                        promises[theatre] = getTheatreSchedule(url_suffix);
                    });
                });
            });

            const results = {};
            yield Promise.mapSeries(_.values(promises), function (result, idx) {
                results[_.keys(promises)[idx]] = result;
                return Promise.delay(3000);
            }, {concurrency: 2});

            yield firebase.database().ref('schedules').set(results);

            process.exit();
        }catch(e){
            throw e;
        }
    })();

    function getTheatreSchedule(url){
        return new Promise((resolve, reject)=>{
            Promise.coroutine(function*(){
                const response = yield rp({
                    url: `http://www.clickthecity.com/movies/${url}`
                });
                console.log(`--------Processing theatre: ${url}`);
                const $ = cheerio.load(response);

                const theatersArea = $('div#theatersArea');

                // get date
                let date;
                try{
                    date = new Date($(theatersArea).find('div').first().text().split(', ')[1] + ', 2016');
                }catch(e){
                    throw('Could not parse out date');
                }

                // iterate over cinema list
                const theatre = {
                    date: date.toJSON(),
                    cinemas: []
                };
                $(theatersArea).find('ul#cinemas').children().each((i, li)=>{
                    const cinemaName = $(li).find('span.cinema').text();
                    // console.log(cinemaName);
                    const movieSchedule = $(li).find('ul').first();
                    // console.log($(movieSchedule).html());

                    if(cinemaName){
                        const schedule = parseOutSchedule(movieSchedule)
                        if(schedule){
                            // console.log(schedule);
                            theatre.cinemas.push({
                                cinemaName: cinemaName.replace('No schedule', ''),
                                schedule
                            });
                        }
                    }
                });
                resolve(theatre);
            })();
        })
    }

    function parseOutSchedule(movieSchedule){
        let $ = cheerio.load(movieSchedule);
        if($(movieSchedule).children().length){
            return parseMovieHtml(movieSchedule);
        }else{
            return [];
        }
    }

    function parseMovieHtml(movieHtml){
        let $ = cheerio.load(movieHtml);

        let cinemas = [];
        $(movieHtml).find('li').each((i, li)=>{
            let mainSpan = $(li).find('span');

            let title = $(mainSpan).find('a').text();
            let rating = $(mainSpan).find('span').first().find('span').first().text();
            let running_time = $(mainSpan).find('.running_time').text();
            let schedule = $(mainSpan).find('div').text();

            cinemas.push({
                title, rating, running_time, schedule
            });
        });

        return cinemas;
    }
})();
