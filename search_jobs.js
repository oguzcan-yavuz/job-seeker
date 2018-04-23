const rp = require('request-promise-native');
const argv = require('yargs')
    .usage("Usage: node $0 [options]")
    .example("node $0 -l 41.013725,28.9187643 -r 8000 -k software")
    .alias('l', 'location')
    .describe('l', 'Latitude and longitude of a location')
    .alias('r', 'radius')
    .describe('r', 'Search radius of the given location in meters.')
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

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function get_company_ids(api_key, location, radius, keyword, page_token, counter) {
    return new Promise(async function(resolve, reject) {
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
        let response = await rp(options);
        response = JSON.parse(response.body);
        if(!response)
            return reject(new Error('fail'));
        else {
            handle_company_ids(company_infos, response, api_key, counter);
            await timeout(2000);
            return resolve(company_infos);
        }
    });
}

function handle_company_ids(company_infos, response, api_key, counter) {
    console.log("Fetching " + get_ordinal(counter) + " page.");
    let results = response.results;
    for(let i in results) {
        if(results.hasOwnProperty(i)) {
            get_company_details(results[i].place_id, api_key).then((result) => {
                if(result.website !== undefined)     // check if the website link exist
                    company_infos.results.push(result);
            });
        }
    }
    company_infos.page_token = response.next_page_token;
}

function get_company_details(company_id, api_key) {
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
            else
                return Promise.resolve(handle_details(response));
        })
}

function handle_details(response) {
    return {
        name: response.result.name,
        map: response.result.url,
        website: response.result.website
    };
}

async function main() {
    let args = args_handler();
    let api_key = args.api, radius = args.r, location = args.l, keyword = args.k
    let page_token = "", company_counter = 0, counter = 1;
    while(page_token !== undefined) {
        let company_infos = await get_company_ids(api_key, location, radius, keyword, page_token, counter);
        console.log(company_infos.results);
        page_token = company_infos.page_token;
        company_counter += company_infos.results.length;
        counter++;
    }
    console.log("Total companies found: " + company_counter);
}

function args_handler() {
    const default_api_key = "AIzaSyCeaN9xCVnbdfAl6ZGAEu6g8n1mwW2aMMw";
    return {
        api: (argv.api) ? argv.api : default_api_key,
        r: argv.r,
        l: argv.l,
        k: argv.k
    }
}

main();
