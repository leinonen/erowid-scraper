// Scrape drug information from erowid.org, and save result as json

const R = require('ramda')
const fs = require('fs')
const axios = require('axios')
const cheerio = require('cheerio')

const getPage = (url) => axios.get(url).then(({ data }) => ({ url, markup: data }))
const getBase = pageUrl => pageUrl.slice(0, pageUrl.lastIndexOf('/'))
const slasher = (base, url) => `${base}${url.startsWith('/') ? '' : '/'}${url}`
const fixUrl = (url) => slasher(`https://erowid.org`, url)

const matching = R.curry((kind, url) => url.includes(kind))
const sortByNameCaseInsensitive = R.sortBy(R.compose(R.toLower, R.prop('name')));

const saveToDisk = R.curry((filename, data) => {
  fs.writeFileSync(filename, JSON.stringify(data, null, '  '))
  return data;
})

const printDrug = drug => console.log(drug)

const extractSubstanceLinks = ({ markup }) => {
  const $ = cheerio.load(markup)
  const getHref = (_, el) => $(el).attr('href')
  return $('.substance-link-table a').map(getHref).get()
}

const extractDetailImageUrl = (pageUrl, $) => {
  const link = $('.summary-card-topic-image img').attr('src')
  return slasher(getBase(pageUrl), link);
}

const extractBasicsUrl = (url, $) => {
  const link = $('.summary-card-icon-surround a').first().attr('href')
  return slasher(getBase(url), link)
}

const extractBasics = (basicsUrl) => {
  return getPage(basicsUrl).then(({ markup }) => {
    const $ = cheerio.load(markup)
    return {
      basics: {
        description: $('.basics-text').text(),
        dose: $('.basics-dose .basics-text').text(),
        chemistry: $('.basics-chemistry .basics-text').text(),
        pharmacology: $('.basics-pharmacology .basics-text').text(),
        law: $('.basics-law .basics-text').text(),
        history: $('.basics-history .basics-text').text(),
        effects: $('.basics-effects .basics-text').text(),
      }
    };
  });
}

const extractDetails = ({ url, markup }) => {
  const $ = cheerio.load(markup)
  const basicsUrl = extractBasicsUrl(url, $);

  const details = {
    name: $('.ts-substance-name').text(),
    commonName: $('.sum-common-name').text(),
    description: $('.sum-description').text(),
    effects: $('.sum-effects').text(),
    chemicalName: $('.sum-chem-name').text(),
    image: extractDetailImageUrl(url, $),
    url,
    basicsUrl,
  }

  return extractBasics(basicsUrl).then(basics => Object.assign(details, basics))
}

const fetchDrugDetails = R.composeP(extractDetails, getPage)


getPage('https://erowid.org/psychoactives/psychoactives.shtml')
  .then(extractSubstanceLinks)
  .then(R.filter(matching('chemicals'))) // chemicals, plants, pharma
  .then(R.map(fixUrl))
  // Promise.resolve(['https://erowid.org/chemicals/dmt/dmt.shtml'])
  .then(urls => Promise.all(R.map(fetchDrugDetails)(urls)))
  .then(sortByNameCaseInsensitive)
  .then(saveToDisk('drugs.json'))
  .then(R.map(printDrug))
  .catch(console.error)
