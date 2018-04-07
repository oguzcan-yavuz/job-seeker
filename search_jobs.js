const rp = require('request-promise-native');
const default_api_key = "AIzaSyCeaN9xCVnbdfAl6ZGAEu6g8n1mwW2aMMw";

function get_ordinal(n) {
   let s = ["th", "st", "nd", "rd"],
       v = n % 100;
   return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function print_help() {
    console.log(
        "Parameters: " +
        "\n\t-h: print this help menu" +
        "\n\t-l: location in latitude,longitude format" +
        "\n\t-r: radius in meters" +
        "\n\t-k: keyword to use for search at google places api" +
        "\n\t--api-key: (OPTIONAL) use another api key than default api key" +
        "\nExample usage: node search_jobs.js -l 41.013725,28.9187643 -r 8000 -k software"
    );
}

function args_handler() {
    // TODO: check the given data types for arguments
    let location, radius, keyword, api_key = default_api_key;
    for(let i = 2; i < process.argv.length; i += 2) {
        if (process.argv[i] === "-l") {
            location = process.argv[i + 1];
        } else if (process.argv[i] === "-r") {
            radius = process.argv[i + 1];
        } else if (process.argv[i] === "-k") {
            keyword = encodeURIComponent(process.argv[i + 1]);
        } else if (process.argv[i] === "--api-key") {
            api_key = process.argv[i + 1];
        } else if(process.argv[i] === "-h") {
            print_help();
            return;
        } else {
            console.log("Invalid usage.\n");
            print_help();
            return;
        }
    }
    // start the program if the given args are correct
    get_company_ids(api_key, location, radius, keyword).then((company_infos) => {
        console.log(company_infos);
        console.log("Total companies found: " + company_infos.length);
    });
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function get_company_ids(api_key, location, radius, keyword) {
    let company_infos = [];
    let page_token = "";
    let counter = 1;
    while(page_token !== undefined) {
        let query_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location="
            + location + "&radius=" + radius + "&keyword=" + keyword + "&key=" + api_key + "&pagetoken=" + page_token;
        let options = {
            uri: query_url,
            resolveWithFullResponse: true
        };
        await rp(options)
            .then(function(response) {
                response = JSON.parse(response.body);
                if(!response)
                    return Promise.reject(new Error('fail')).catch(() => console.err);
                console.log("Fetching " + get_ordinal(counter++) + " page.");
                let results = response.results;
                for(let i in results) {
                    if(results.hasOwnProperty(i)) {
                        get_company_infos(results[i].place_id, api_key).then((result) => {
                            if(result.website !== undefined)     // check if the website link exist
                                company_infos.push(result);
                        });
                    }
                }
                page_token = response.next_page_token;
            })
            .catch(console.error);
        await timeout(2000);
    }
    return company_infos;
}

async function get_company_infos(company_id, api_key) {
    let query_url = "https://maps.googleapis.com/maps/api/place/details/json?placeid="
        + company_id + "&key=" + api_key;
    const options = {
        uri: query_url,
        resolveWithFullResponse: true
    };
    return rp(options)
        .then((response) => {
            if(!response)
                return Promise.reject(new Error('fail')).catch(() => console.err);
            let company_details = [];
            let keys = ["name", "map", "website"];
            let result = {};
            response = JSON.parse(response.body);
            company_details.push(response.result.name);
            company_details.push(response.result.url);
            company_details.push(response.result.website);
            for(let i = 0; i < keys.length; i++)
                result[keys[i]] = company_details[i];
            return result;
        })
        .catch(console.error);
}

args_handler();
