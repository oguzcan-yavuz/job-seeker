const rp = require('request-promise-native');
const default_api_key = "AIzaSyCeaN9xCVnbdfAl6ZGAEu6g8n1mwW2aMMw";
const argv = require('yargs')
    .usage("Usage: node $0 [options]")
    .example("node $0 -l 41.013725,28.9187643 -r 8000 -k software")
    .alias('l', 'location')
    .describe('l', 'Latitude and longitude of a location')
    .alias('r', 'radius')
    .describe('r', 'Search radius of the given location in meters')
    .alias('k', 'keyword')
    .describe('k', 'keyword to use for search at google places api')
    .alias('api', 'api-key')
    .describe('api', 'use another api key than default api key')
    .demandOption(["l", "r", "k"])
    .help('h')
    .alias('h', 'help')
    .argv;

function get_ordinal(n) {
   let s = ["th", "st", "nd", "rd"],
       v = n % 100;
   return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

async function args_handler() {
    let location = argv.l, radius = argv.r, keyword = argv.k, api_key = default_api_key;
    if(argv.api)
        api_key = argv.api;
    // start the program if the given args are correct
    // TODO: main'deki uyariyi coz. kodu daha modueler hale getir.
    main(api_key, location, radius, keyword);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function get_company_ids(api_key, location, radius, keyword, page_token, counter) {
    return new Promise(async function(resolve) {
        let company_infos = {
            results: [],
            page_token: undefined
        };
        let options = {
            uri: "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
            qs: {
                location: location,
                radius: radius,
                keyword: keyword,
                key: api_key,
                pagetoken: page_token
            },
            resolveWithFullResponse: true
        };
        await rp(options)
            .then(function(response) {
                response = JSON.parse(response.body);
                if(!response)
                    return Promise.reject(new Error('fail')).catch(() => console.err);
                console.log("Fetching " + get_ordinal(counter) + " page.");
                let results = response.results;
                for(let i in results) {
                    if(results.hasOwnProperty(i)) {
                        get_company_infos(results[i].place_id, api_key).then((result) => {
                            if(result.website !== undefined)     // check if the website link exist
                                company_infos.results.push(result);
                        });
                    }
                }
                company_infos.page_token = response.next_page_token;
            });
        await timeout(2000);
        return resolve(company_infos);
    });
}

async function get_company_infos(company_id, api_key) {
    const options = {
        uri: "https://maps.googleapis.com/maps/api/place/details/json",
        qs: {
            placeid: company_id,
            key: api_key
        },
        resolveWithFullResponse: true
    };
    return rp(options)
        .then((response) => {
            response = JSON.parse(response.body);
            if(!response)
                return Promise.reject(new Error('fail')).catch(() => console.err);
            let company_details = [];
            let keys = ["name", "map", "website"];
            let result = {};
            company_details.push(response.result.name);
            company_details.push(response.result.url);
            company_details.push(response.result.website);
            for(let i = 0; i < keys.length; i++)
                result[keys[i]] = company_details[i];
            return result;
        })
}

async function main(api_key, location, radius, keyword) {
    let page_token = "";
    let company_counter = 0;
    let counter = 1;
    while(page_token !== undefined) {
        await get_company_ids(api_key, location, radius, keyword, page_token, counter).then((company_infos) => {
            console.log(company_infos.results);
            page_token = company_infos.page_token;
            company_counter += company_infos.results.length;
            counter++;
        }).catch(console.error);
    }
    console.log("Total companies found: " + company_counter);
}

args_handler();
