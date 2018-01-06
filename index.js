// Scrape drug information from erowid.org, and save result as json

const R = require('ramda')
const cheerio = require('cheerio')
const { getPage, getBase, slasher, fixUrl, saveToDisk } = require('./utils')

const matching = R.curry((kind, url) => url.includes(kind))
const sortByNameCaseInsensitive = R.sortBy(R.compose(R.toLower, R.prop('name')));

const invalidDrug = ({ name }) => name === undefined

const printDrug = drug => console.log(drug)

const stripLineFeeds = R.replace(/\n/g, '')

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
    const select = selector => stripLineFeeds($(selector).text())
    return {
      basics: {
        description: select('.basics-text'),
        dose: select('.basics-dose .basics-text'),
        chemistry: select('.basics-chemistry .basics-text'),
        pharmacology: select('.basics-pharmacology .basics-text'),
        law: select('.basics-law .basics-text'),
        history: select('.basics-history .basics-text'),
        effects: select('.basics-effects .basics-text'),
      }
    };
  });
}

const extractDetails = ({ url, markup }) => {
  const $ = cheerio.load(markup)
  const basicsUrl = extractBasicsUrl(url, $);

  const buildArray = R.pipe(
    R.split(';'),
    R.map(R.trim),
    R.reject(e => e.length === 0)
  )

  const getName = () => {
    let name = $('.ts-substance-name').text()
    if (name === '') {
      name = $('.ts-substance-name img').attr('alt')
      console.log('NAME', name)
    }
    return name
  }

  const details = {
    name: getName(),
    commonNames: buildArray($('.sum-common-name').text()),
    description: $('.sum-description').text(),
    effects: buildArray($('.sum-effects').text()),
    chemicalName: $('.sum-chem-name').text(),
    image: extractDetailImageUrl(url, $),
    url,
    basicsUrl,
  }

  return extractBasics(basicsUrl).then(basics => Object.assign(details, basics))
}

const fetchDrugDetails = R.composeP(extractDetails, getPage)

const app = R.pipeP(
  getPage,
  extractSubstanceLinks,
  R.map(fixUrl),
  R.map(fetchDrugDetails),
  drugPromises => Promise.all(drugPromises),
  R.reject(invalidDrug),
  sortByNameCaseInsensitive,
  saveToDisk('drugs.json'),
  R.map(printDrug)
)

app('https://erowid.org/psychoactives/psychoactives.shtml')
  .catch(console.error)
