#!/usr/bin/env node

http = require 'http'
fs = require 'fs'
fse = require 'fs-extra'
request = require 'request'
Sequence = require('sequence').Sequence
pkg = require './bower.json'
Git = require 'nodegit'
unzip = require 'unzip'
Q = require 'q'

reqClientInfo = "client_id=#{process.env.GHC_ID}&client_secret=#{process.env.GHC_SECRET}"
dest =
  bootswatch: ".tmp/bootswatch"
  bootstrap: ".tmp/bootstrap"
  dist: ".tmp/dist"

fs.mkdirSync ".tmp" if not fs.existsSync ".tmp"

downloadFile = (src, dest) ->
  deferred = Q.defer()
  if fs.existsSync(dest)
    console.log "File already downloaded to #{dest}."
    deferred.resolve()
  else
    request
      url: src
      encoding: null
      headers:
        'user-agent': 'dbtek'
        'If-Modified-Since': 'Thu, 05 Mar 2014 15:31:30 GMT'
    .pipe fs.createWriteStream(dest)
      .on "close", ->
        console.log "File saved to #{dest}"
        deferred.resolve()
      .on "error", -> deferred.reject()

  deferred.promise

getBareVersion = (version) ->
  version = version.replace '+', '-'
  if version[0] == 'v'
    version = version.substr(1)
  version

checkVersions = ->
  localVersion = pkg.version
  deferred = Q.defer()
  updateTags = []
  getTags = (page) ->
    console.log "Checking thomaspark/bootswatch tags ##{page}..."
    request.get {
      url: "https://api.github.com/repos/thomaspark/bootswatch/tags?page=#{page}&#{reqClientInfo}"
      headers:
        'user-agent': 'dbtek'
    }, (err, response, data) ->
      tags = JSON.parse data
      tags.forEach (tag) ->
        updateTags.push tag if getBareVersion(tag.name) > localVersion
      if tags.length > 0
        getTags page + 1
      else
        deferred.resolve(updateTags.reverse())

  getTags 1
  deferred.promise


fetchBootswatchZip = (version) ->
  fs.mkdirSync dest.bootswatch  if not fs.existsSync dest.bootswatch
  bareVersion = getBareVersion(version)
  deferred = Q.defer()

  console.log "Downloading bootswatch zip for #{version} ..."
  downloadFile "https://github.com/thomaspark/bootswatch/archive/#{version}.zip", "#{dest.bootswatch}/#{bareVersion}.zip"
    .then ->
      console.log "Extracting zip..."
      fs.createReadStream "#{dest.bootswatch}/#{bareVersion}.zip"
        .pipe unzip.Extract(path: "#{dest.bootswatch}")
        .on "finish", ->
          console.log "Zip extracted to #{dest.bootswatch}/#{bareVersion}."
          deferred.resolve()

  deferred.promise

fetchBootstrapFiles = (version) ->
  version = getBareVersion(version)
  deferred = Q.defer()

  fs.mkdirSync dest.bootstrap  if not fs.existsSync dest.bootstrap
  fs.mkdirSync "#{dest.bootstrap}/#{version}"  if not fs.existsSync "#{dest.bootstrap}/#{version}"
  fs.mkdirSync "#{dest.bootstrap}/#{version}/js" if not fs.existsSync "#{dest.bootstrap}/#{version}/js"
  fs.mkdirSync "#{dest.bootstrap}/#{version}/fonts" if not fs.existsSync "#{dest.bootstrap}/#{version}/fonts"

  cdnUrl = "http://netdna.bootstrapcdn.com/bootstrap"
  files = [
    "js/bootstrap.js"
    "js/bootstrap.min.js"
    "fonts/glyphicons-halflings-regular.eot"
    "fonts/glyphicons-halflings-regular.woff"
    "fonts/glyphicons-halflings-regular.woff2"
    "fonts/glyphicons-halflings-regular.ttf"
    "fonts/glyphicons-halflings-regular.svg"
  ]

  console.log "Downloading Bootstrap files..."
  dlPromises = []
  files.forEach (file) ->
    dlPromises.push downloadFile "#{cdnUrl}/#{version}/#{file}", "#{dest.bootstrap}/#{version}/#{file}"

  # resolve promise after all downloads done
  Q.allSettled dlPromises
    .then deferred.resolve
  # return promise
  deferred.promise

themes = (version) ->
  # scans all themes in bootswatch version folder
  themes = []
  deferred = Q.all()
  fs.readdirSync "#{dest.bootstrap}/bootswatch-#{getBareVersion(version)}", function(dirs) ->
    dirs.forEach (dir) ->
      if fs.existsSync "#{dir}/bootstrap.css"
        themes.push dir
    deferred.resolve themes
  deferred.promise

cloneRepo = ->
  deferred = Q.defer()
  Git.Clone pkg.repository.url, dest.dist, (repository) ->
    deferred.resolve repository
  deferred.promise

copyFiles = (theme, version) ->
  # copy bootswatch theme
  version = getBareVersion version
  fse.copySync "#{dest.bootswatch}/bootswatch-#{getBareVersion(version)}/#{theme}/bootstrap*.css", "#{dest.dist}/css"
  fse.copySync "#{dest.bootswatch}/bootstrap/#{getBareVersion(version)}/bootstrap/*", "#{dest.dist}"

# init
fetchVersions = (tags) ->
  allDeferred = Q.defer()
  versionFilesPromises = []

  tags.forEach (tag, i) ->
    versionDeferred = Q.defer()
    versionFilesPromises.push versionDeferred.promise

    console.log "Fetching files for version #{tag.name}..."
    # fetch files async
    Q.allSettled [fetchBootswatchZip(tag.name), fetchBootstrapFiles(tag.name)]
      .then ->
        # notify single version is ready
        allDeferred.notify(i)
        # resolve version file promise
        versionDeferred.resolve()

  # all versions fetched, resolve main promise
  Q.allSettled versionFilesPromises
    .then ->
      allDeferred.resolve()

  # return promise
  allDeferred.promise

checkVersions()
  .then (tags) ->
    return console.log("Already up to date!") if tags.length == 0

    fetchVersions(tags)
      .then ->
        console.debug "All versions are ready."
        cloneRepo.then ->

      , ->
        console.error "Fetching versions failed!"
      , (index) ->
        console.log "Version ##{index} is ready."
