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
    privateKey: `-----BEGIN PRIVATE KEY-----\n${process.env.KEY_PART}\n/QyKS+yVhYmfMDxZtcc/aZSP19xqBeTqoEAmZ+GC4G38kyuazKfUV7ftgiSaUZA1\niuDmCLLxo78cevznHzmxbhFtei2TpkfiU5cKsFf8bhG3yCR1BG7pvMj712yjaVDS\nWUQkpnjMYBh0GeG3cGCdT1YGyE5jCSPS+pns22JAsL+ByJc0AtJxE6IzgvpjUf/e\ny3mrQ+LYKl3EE2V62Q/BU+Lh11uyyIF6SxR0ePSOA60t7aiimzp6laBA/kbfX1qN\n/HURma2hQvfL1EE9sC42AGHdBsRkQ/U9dOqQrxOE8W2o1t4KXOOJtR48lnXrAzzG\nfwgnRjOZAgMBAAECggEBAMxfBQLkya0jh2KyK5ixeVV7ZNDUQJbOVCRWEN9Xu1jV\nVKWkIBJ4qIRHzzT12lptb3ZVPB03Za+BNO/isxS+Nkncxk32Ja4ApTNSg5bhOoCx\nTiG4Z941MudqUcbYlQ5KN++hH+jRzeeRZDWpb36PJYMTFsud7D3JWCjaZteqRry0\nZ76hFoHC4jQt9rsHna4/2j9LjfzgbzirVt/4RUL28Tmt1KY86a1oRDxQTLG6Ar9N\ncE67RxUeNyfEnvjUrO+vrMESnKnxIhH4jeJIdsX+Afwj4CoFdhLfEU6n+rEzOzna\nOqSpE7zmq3pjgFqtHbWjdYTLPVp9GP/PTBNSAjuaUOECgYEA6jJGrpXbEKb4xrR0\n6Tcge2wOexP1TI33MgpUXq7lTd+IME+STV+ObPaYQDahECcXU1ZRTakkDkYgYv6g\nIK6bqQA8SWWnV+IiHA86O2Opt5fIyWrf9Wbnpo8mg+LKP1dNSFtIf7YF/5PFYPib\ntuZ5hAOYO0TmMWb+JyWRYwAfu00CgYEA50kaprMpKhPAvnEMDCz0SzK2E8hYOUDo\n06f/7cBlANEiblak9Sf5XfNoCihJDLxC1ZcQhXbULsBSfdrAB1tvnMxj6WFvU9pT\n9uk9FLsLkPVB3qt49W5oje/6vX+gpFj+tod1Dldc5LwocHCJ3aXL2yShcZaMG3jy\nJoOqMPWRO30CgYB3Y/4IjrjI+nYkxmY7ZjEW+nU/ZWNODamRRxbP1hVr56LEDiyl\naStwfR4Mzky5sVQA1iZIkwuggzuLfAch4iHUvBv/xuTStqNw7opfMGWbBLQFioh1\n0GoTzTJzVbCJLfZmBrMk+CSCsFCVKOgpC8Gy/SokPPGlCb5TMqG1eKC0mQKBgQDS\nNNMQJ02GfKV1cPFuL31oyxJJMJFel+wEUnB8+ZvS/kC43+7VEhvGk+8/LBYYiRKF\nZeMSKkn2o71VvXdCOIxcijdUacXxBEHD64AkU0vT19SiOF6bUlmchzvw9wpd1LTL\n2Jk/C4/WJFzstJvY41NAPS6uOhHk9iu/bXNFRCtXUQKBgQDI+rQzn5ddIK588d3p\nyNeg2NrpMTEUDsoV/7pufQgtBwzPs8YODlNamD95f3ZeKEY5h2461J/+EphxyxgX\nnhomisKd2KseMqxA9E5WW2ALgwuMoe5G4pGHeFez5Sl72lwilCBZaZN4gveFfptc\nydxjbvTpJ417Yn8h3iecQhIJrA==\n-----END PRIVATE KEY-----\n`
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
