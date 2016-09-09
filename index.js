const co = require('co');
const rp = require('request-promise');
const cheerio = require('cheerio');
const _ = require('lodash');

(()=>{
    'use strict';

    co(function*(){
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

        console.log(`Grabbed ${Object.keys(regions[0]).length + Object.keys(regions[1]).length} regions`);

        regions.forEach((region)=>{
            _.each(region, (loc, key)=>{
                console.log(loc);
            });
        })

    }).catch((e)=>{
        console.error(e);
    });

    function processLocation(){

    }

})();
