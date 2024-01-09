const { writeFileSync, readFileSync } = require('fs');
const { execSync } = require('child_process')

const targetPath = './public/version.json'
const currentVersion = (JSON.parse(readFileSync(targetPath).toString()).version as string).split('.')

const newVersion = `${currentVersion.slice(0, 2).join('.')}.${parseInt(currentVersion[2], 10) + 1}`

const newContent = {
  version: newVersion
}
console.log(`Updating version to ${newVersion}`)

writeFileSync(targetPath, JSON.stringify(newContent, null, 2))

execSync(`git add ${targetPath}`)