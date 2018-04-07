const rp = require('request-promise-native');

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function get_company_ids(api_key, location, radius, keyword) {
    let company_urls = [];
    let page_token = "";
    while(page_token !== undefined) {
        let query_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location="
            + location + "&radius=" + radius + "&keyword=" + keyword + "&key=" + api_key + "&pagetoken=" + page_token;
        await rp({ uri: query_url, resolveWithFullResponse: true })
            .then(function(response) {
                response = JSON.parse(response.body);
                let results = response.results;
                for(let i in results) {
                    if(results.hasOwnProperty(i)) {
                        get_company_urls(results[i].place_id, api_key).then((result) => {
                            if(result[1] !== undefined)     // website
                                company_urls.push(result);
                        });
                    }
                }
                page_token = response.next_page_token;
            })
            .catch(console.log);
        await timeout(2000);
    }
    return company_urls;
}

async function get_company_urls(company_id, api_key) {
    let query_url = "https://maps.googleapis.com/maps/api/place/details/json?placeid="
        + company_id + "&key=" + api_key;
    let company_details = [];
    await rp({ uri: query_url, resolveWithFullResponse: true })
        .then((response) => {
            response = JSON.parse(response.body);
            company_details.push(response.result.url);
            company_details.push(response.result.website);
        })
        .catch(console.log);
    return company_details;
}

const api_key = "AIzaSyCeaN9xCVnbdfAl6ZGAEu6g8n1mwW2aMMw";
const location = "41.013725,28.9187643";
const radius = "8000";
const keyword = encodeURIComponent("yazılım");

let test = process.argv[2];

get_company_ids(api_key, location, radius, keyword).then((company_urls) => {
    console.log(company_urls);
    console.log("Total companies found: " + company_urls.length);
});
