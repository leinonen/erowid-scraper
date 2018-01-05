const R = require('ramda')
const cheerio = require('cheerio')
const { getPage, saveToDisk } = require('./utils')
const commonWords = require('./common-words')

const extractText = ({ markup }) => {
  const $ = cheerio.load(markup)
  return $('.content-section').text()
}

const containsNumber = x => x.match(/\d+/g) !== null
const onlyWords = R.compose(R.not, containsNumber)

const clean = R.pipe(
  R.split(' '),
  R.map(s => s.replace(/\W/g, '')),
  R.map(R.toLower)
)

const parser = R.pipeP(
  getPage,
  extractText,
  clean,
  R.filter(onlyWords),
  R.filter(s => s.length > 0),
  R.reject(w => commonWords.includes(w)),
  R.sortBy(R.toLower)
)

const countOccurences = (acc, word) => Object.assign(acc, {
  [word]: acc[word] ? (acc[word] + 1) : 1
})

const countWordOccurences = R.reduce(countOccurences, {})

const transform = R.pipe(
  Object.entries,
  R.map(([word, count]) => ({ word, count })),
)

const businessLogic = R.pipe(
  R.reject(({ count }) => count < 3),
  R.map(({ word }) => word),
  R.sortBy(R.toLower)
)

const app = R.pipeP(
  parser,
  countWordOccurences,
  transform,
  businessLogic,
  saveToDisk('dictionary.json')
)

const parts = [
  'https://erowid.org',
  'culture',
  'characters',
  'mckenna_terence',
  'mckenna_terence_tryptamines_consciousness.shtml'
]

app(R.join('/')(parts))
