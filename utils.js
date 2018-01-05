const R = require('ramda')
const fs = require('fs')
const axios = require('axios')

const getPage = (url) => axios.get(url).then(({ data }) => ({ url, markup: data }))
const getBase = pageUrl => pageUrl.slice(0, pageUrl.lastIndexOf('/'))
const slasher = (base, url) => `${base}${url.startsWith('/') ? '' : '/'}${url}`
const fixUrl = (url) => slasher(`https://erowid.org`, url)

const matching = R.curry((kind, url) => url.includes(kind))

const saveToDisk = R.curry((filename, data) => {
  fs.writeFileSync(filename, JSON.stringify(data, null, '  '))
  return data;
})

module.exports = {
  getPage,
  getBase,
  slasher,
  fixUrl,
  matching,
  saveToDisk,
}
