const rp = require('request-promise');
const cheerio = require('cheerio');
const _ = require('lodash');
const Promise = require('bluebird');
const assert = require('assert');

(()=>{
    'use strict';

    Promise.coroutine(function*(){
        try{
            console.log(yield getCinemasFromLocation('/movies/theaters.php?cid=15'));
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

            regions.forEach((region)=>{
                _.each(region, (loc, key)=>{
                    console.log(loc);
                });
            })
        }catch(e){
            throw e;
        }

    })();


    function getCinemasFromLocation(url){
        return new Promise((reslve, reject)=>{
            Promise.coroutine(function*(){
                try{
                    let response = yield rp.get('http://www.clickthecity.com' + url)
                    let $ = cheerio.load(response);

                    const theatre_list = $('section#maincontent').find('ul')[0];
                    assert(theatre_list !== null);

                    console.log(response);

                    $(theatre_list).find('a').each((i, ele)=>{
                        console.log($(ele).text());
                    });
                }catch(e){
                    reject(e);
                }
            })();
        })
    }

})();
