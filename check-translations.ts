const { writeFileSync, readFileSync, readdirSync } = require('fs');
const { execSync } = require('child_process')

const localesFolder = './src/locales/'
const mainFile = 'en.json'

function readFiles(dirname: any, onFileContent: any, onError: any) {
  const filenames = readdirSync(dirname)
  filenames.forEach(function (filename: any) {
    const content = readFileSync(dirname + filename, 'utf-8')
    onFileContent(filename, content)
  })
}

const translations: any = {}
readFiles(localesFolder, function (filename: any, content: any) {
  translations[filename] = JSON.parse(content)
}, function (err: any) {
  throw err
})
Object.keys(translations).filter(k => k !== mainFile).forEach(lang => {
  Object.keys(translations[mainFile]).forEach(k => {
    if (!translations[lang][k])
      console.error(`missing translation for lang ${lang.replace('.json', '')}: ${k}`)
  })
})
