const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const fetch = require('node-fetch')
const git = require('simple-git')('./')
const semver = require('semver')
const chalk = require('chalk')
const ncp = require('ncp').ncp
const glob = require('glob')
const download = require('download')

const update = require('./update.json')
const bower = require('./bower.json')
const pkg = require('./package.json')

const apiUrl = 'https://api.github.com/repos/thomaspark/bootswatch'
const GH_TOKEN = process.env.GH_TOKEN
const reqOpts = {
  headers: {
    'Authorization': `token ${GH_TOKEN}`
  }
}

function clearDirectory(directory) {
  return new Promise((resolve, reject) => {
    fs.readdir(directory, (err, files) => {
      if (err) throw err
      for (const file of files) {
        if (file == '.git') continue
        fse.removeSync(path.join(directory, file))
        resolve()
      }
    })
  })
}

/**
 * Converts v1.0.1+1 to 1.0.1+1
 * @param  {String} version Semantic version
 * @return {String}         Clean semantic version
 */
function cleanVersion(version) {
  if (version[0] === 'v')
    return version.slice(1)
  return version
}

/**
 * Fetches tags from github.
 * @return {[type]} [description]
 */
function getTags() {
  return fetch(`${apiUrl}/tags?per_page=100`, reqOpts).then(r => r.json())
}

/**
 * Filters bootswatch versions greater than latest update defined in update.json.
 * @return {Promise} Promise to be resolved with new versions.
 */
function getNewVersions() {
  return getTags()
    .then(tags => {
      var newVersions = []
      for(tag of tags) {
        if (semver.gt(tag.name, update.latest) || (
            semver.eq(tag.name, update.latest) && (semver(tag.name).build[0] || 0) > (semver(update.latest).build[0] || 0)
          )) {
          newVersions.push(tag)
        }
      }
      newVersions.reverse()
      // order versions from lower to greater
      console.log(chalk.blue('New versions available: ' + (newVersions.map(v => v.name).join(', ') || 'none') + '.'))
      return newVersions
    })
    .catch(e => console.log(e.stack))
}

/**
 * Searches less file (older and newer versions include less file) inside downloaded directories and finds out which directories are belong to themes.
 * @param  {String} path Working dir
 * @return {Promise}     Promise to be resolved with theme names array.
 */
function getDownloadedThemes(path) {
  return new Promise((resolve, reject) => {
    const searchFile = 'bootswatch.less'
    glob('*/'+searchFile, { cwd: path }, (err, files) => {
      resolve(files.map(f => f.split('/'+searchFile)[0]).filter(f => f !== 'custom'))
    })
  })
}

/**
 * Clones release repository
 * @return {Promise}
 */
function cloneRepo() {
  return new Promise((resolve, reject) => {
    git.clone(`https://${GH_TOKEN}@github.com/dbtek/bootswatch-dist.git`, '.tmp/repo', (err, result) => {
      if (err) {
        return reject(err)
      }
      resolve(result)
    })
  })
}

/**
 * Copies repository folder to given destination
 * @param  {String} dest
 * @return {Promise}
 */
function copyRepo(dest) {
  return new Promise((resolve, reject) => {
    ncp('.tmp/repo', dest, (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

/**
 * Downloads bootstrap js and font files by given version to destination path.
 * @param  {String} version Semver
 * @param  {String} path    Save destination
 * @return {Promise}
 */
function downloadBootstrapAssets(version, path) {
  console.log(chalk.blue((`Downloading Bootstrap assets to ${path}`)))
  version = semver.clean(version)
  const url = 'https://maxcdn.bootstrapcdn.com/bootstrap'
  var proms = [
    'fonts/glyphicons-halflings-regular.eot',
    'fonts/glyphicons-halflings-regular.woff',
    'fonts/glyphicons-halflings-regular.woff2',
    'fonts/glyphicons-halflings-regular.ttf',
    'fonts/glyphicons-halflings-regular.svg'
  ].map(f => {
    return download(`${url}/${version}/${f}`, `${path}/fonts`)
      .catch(e => {
        console.log(chalk.red(`Downloading ${version}/${f} failed.`))
        return Promise.resolve()
      })
  })

  proms = proms.concat([
      'js/bootstrap.js',
      'js/bootstrap.min.js'
    ].map(f => {
      return download(`${url}/${version}/${f}`, `${path}/js`)
        .catch(e => {
          console.log(chalk.red(`Downloading ${version}/${f} failed.`))
          return Promise.resolve()
        })
    })
  )
  return Promise.all(proms)
}

function setupThemeRepo(theme, version) {
  console.log(chalk.underline.green('Starting to setup ' + theme + '.'))
  const cwd = `.tmp/${version}/${theme}`
  const repoPath = `${cwd}/publish`
  // clone (by simple copying) repo for theme update
  return copyRepo(repoPath)
    .then(() => {
      // check out relevant theme branch
      git.cwd(repoPath)
      return new Promise((resolve, reject) => {
        git.checkout(['-B', theme], (err) => {
          if (err) return reject(err)
          git.pull('origin', theme, (err) => {
            if (err) return reject(err)
            resolve()
          })
        })
      })
    })
    .then(() => {
      return clearDirectory(repoPath).catch(e => {
        console.log(chalk.yellow('Error clearing directory', e))
      })
    })
    .then(() => {
      // place bootstrap assets
      ['css', 'js', 'fonts']
        .map(d => fse.ensureDirSync(`${repoPath}/${d}`));

      ['bootstrap.css', 'bootstrap.min.css']
        .map(f => fse.copySync(`${cwd}/${f}`, `${repoPath}/css/${f}`));

      console.log(chalk.blue('Copied bootswatch files.'))

      return downloadBootstrapAssets(version, repoPath)
    })
    .then(() => {
      console.log(chalk.blue('Writing package info...'))
      return updatePackageInfo(theme, version)
    })
}

/**
 * Creates bower.json and package.json with content relevant to theme.
 * @param  {String} theme   Theme name
 * @param  {String} version Semver
 * @return {Promise}
 */
function updatePackageInfo(theme, version) {
  const cwd = `.tmp/${version}/${theme}/publish`
  bower.version = `${version}-${theme}`
  pkg.version = `${version}-${theme}`
  return Promise.all([
    fs.writeFile(`${cwd}/bower.json`, JSON.stringify(bower, null, 4)),
    fs.writeFile(`${cwd}/package.json`, JSON.stringify(pkg, null, 4))
  ])
}

/**
 * Releases new theme version
 * @param  {String} theme   Theme name
 * @param  {String} version Semver
 * @return {Promise}
 */
function releaseTheme(theme, version) {
  const repoPath = `.tmp/${version}/${theme}/publish`
  return setupThemeRepo(theme, version)
    .then(() => {
      console.log(chalk.blue('Committing changes...'))
      return new Promise((resolve, reject) => {
        // commit changes
        git.add(['css', 'js', 'fonts', 'bower.json', 'package.json'], (err) =>{
          if (err) return reject(err)
          git.commit(`${version} upgrade :arrow_up:`, ['.'], (err, res) => {
            if (err) return reject(err)
            // tag current version (3.3.7-cerulean)
            git.addTag(cleanVersion(version) + '-' + theme, (err) => {
              if (err) return reject(err)
              console.log(chalk.blue('Pushing commit...'))
              // push commit
              git.push('origin', theme, (err) => {
                if (err) return reject(err)
                console.log(chalk.blue('Pushing tag...'))
                // push new tag
                git.pushTags('origin', (err) => {
                  if (err) return reject(err)
                  console.log(chalk.green(`${theme} published.`))
                  resolve()
                })
              })
            })
          })
        })
      })
    })
}

fse.removeSync('.tmp/repo')
cloneRepo().then(() => {
  getNewVersions()
    .then(newVersions => {
      if (newVersions.length === 0) {
        return { status: 1 }
      }
      return newVersions.reduce((p, version) => {
        return p.then(() => {
          console.log(chalk.underline.inverse.green('Updating to ' + version.name + '...'))
          console.log(chalk.blue('Fetching bootswatch...'))
          return download(version.zipball_url, `.tmp/${version.name}`, { extract: true, strip: 1 })
            .then(() => {
              return getDownloadedThemes(`.tmp/${version.name}`)
            })
            .then(themes => {
              return themes.reduce((p, theme) => {
                return p.then(() => {
                  return releaseTheme(theme, version.name)
                    .then(r => console.log(chalk.blue(`Theme update succeeded.`)))
                    .catch(err => console.log(chalk.red('Error updating ' + theme, err)))
                })
              }, Promise.resolve())
            })
            .then(() => {
              return { status: 2, version: version }
            })
          })
      }, Promise.resolve())
    })
    .then((opts) => {
      if (opts.status === 1) {
        console.log(chalk.inverse.green('All is well, we have latest version.'))
        return opts
      }
      return new Promise((resolve, reject) => {
        git.cwd('.', () => {
          update.latest = cleanVersion(opts.version.name)
          fs.writeFile('update.json', JSON.stringify(update, null, 4), () => {
            git.add('update.json', () => {
              git.commit('version upgrade', () => {
                git.push('origin', 'master', () => {
                  console.log(chalk.inverse.green(`Update completed. Latest version is ${update.latest}.`))
                  resolve(opts)
                })
              })
            })
          })
        })
      })
    })
})