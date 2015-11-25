'use strict'

module.exports = (grunt) ->

  pkg = grunt.file.readJSON 'package.json'

  grunt.initConfig
    # Metadata
    pkg: pkg
    bowerConf: grunt.file.readJSON 'bower.json'
    banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
    '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
    '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
    '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
    ' Licensed <%= pkg.license %> */\n'
    # Task configuration
    gruntfile:
      src: 'gruntfile.js'
    # shared config between update tasks
    update:
      destination: 'update/'
      version: ''
    curl:
      # Bootstrap files
      'update/bootstrap/js/bootstrap.js': 'http://netdna.bootstrapcdn.com/bootstrap/latest/js/bootstrap.js',
      'update/bootstrap/js/bootstrap.min.js': 'http://netdna.bootstrapcdn.com/bootstrap/latest/js/bootstrap.min.js',
      'update/bootstrap/fonts/glyphicons-halflings-regular.eot': 'http://netdna.bootstrapcdn.com/bootstrap/latest/fonts/glyphicons-halflings-regular.eot',
      'update/bootstrap/fonts/glyphicons-halflings-regular.woff': 'http://netdna.bootstrapcdn.com/bootstrap/latest/fonts/glyphicons-halflings-regular.woff',
      'update/bootstrap/fonts/glyphicons-halflings-regular.woff2': 'http://netdna.bootstrapcdn.com/bootstrap/latest/fonts/glyphicons-halflings-regular.woff2',
      'update/bootstrap/fonts/glyphicons-halflings-regular.ttf': 'http://netdna.bootstrapcdn.com/bootstrap/latest/fonts/glyphicons-halflings-regular.ttf',
      'update/bootstrap/fonts/glyphicons-halflings-regular.svg': 'http://netdna.bootstrapcdn.com/bootstrap/latest/fonts/glyphicons-halflings-regular.svg'

    http:
      bootswatch:
        options:
          url: 'https://bootswatch.com/api/3.json'
          callback: (error, response, data) ->
            data = JSON.parse data
            if error?
              grunt.log.error 'Something went wrong! Can\'t reach Bootswatch API'
            else
              latestVersion = data.version
              grunt.config.set 'update.version', latestVersion
              grunt.config.set 'update.themes', data.themes
              grunt.log.writeln "We have #{grunt.config.get 'bowerConf.version'}, latest version: #{latestVersion}"
              if latestVersion > grunt.config.get 'bowerConf.version'
                grunt.log.writeln 'New version is available. Updating to: ' + latestVersion
                # fetch themes
                data.themes.forEach (theme) ->
                  # create dynamic http tasks and run them
                  grunt.config.set 'http.fetch' + theme.name + '.options.url', theme.css
                  grunt.config.set 'http.fetch' + theme.name + '.dest', 'update/'+ theme.name.toLowerCase() + '/bootstrap.css'
                  grunt.task.run 'http:fetch' + theme.name
                  grunt.config.set 'http.fetch' + theme.name + 'Min.options.url', theme.cssMin
                  grunt.config.set 'http.fetch' + theme.name + 'Min.dest', 'update/'+ theme.name.toLowerCase() + '/bootstrap.min.css'
                  grunt.task.run 'http:fetch' + theme.name + 'Min'
                grunt.task.run 'fetchBootstrapFiles'
                grunt.task.run 'release'
                grunt.task.run 'updateJsonConf'
              else
                grunt.task.run 'checkThemes'
                grunt.task.run 'releaseNewThemes'

    clean:
      dist:
        src: ['dist']
      tmp:
        src: ['.tmp']

    shell:
      setUser:
        options:
          stdout: false
        command: 'git config --global user.name "Travis Build" && git config --global user.email "$GH_TOKEN"'
      cloneProject:
        options:
          stdout: false
        command: (directory) ->
          'git clone https://$GH_TOKEN@' + pkg.repository.url.split('://')[1] + ' ' + directory

      commitMaster:
        options:
          failOnError: false
          execOptions:
            cwd: '.tmp'
        command: 'git add bower.json package.json && ' +
                 'git commit -m "Auto update - Build #$TRAVIS_BUILD_NUMBER [ci skip]" &&' +
                 'git push origin master'

      createBranch:
        options:
          execOptions:
            cwd: 'dist'
        command: (theme) ->
          return 'git checkout --orphan ' + theme + ' && rm -rf * .gitignore .travis.yml'
      switchBranch:
        options:
          failOnError: true,
          callback: (err, stdout, stderr, cb) ->
            if err
              grunt.task.run 'shell:createBranch:' + this.args[0]
            do cb
          execOptions:
            cwd: 'dist'
        command: (theme) ->
          return 'git checkout ' + theme
      copyUpdate:
        command: (theme) ->
          return 'mkdir -p dist/css && ' +
                 'cp -f update/' + theme + '/*.css dist/css/ && ' +
                 'cp -Rf update/bootstrap/* dist'
      commitChanges:
        options:
          failOnError: false
          execOptions:
            cwd: 'dist'
        command: 'git add . --all && ' +
                 'git commit -m "Auto update - Build #$TRAVIS_BUILD_NUMBER"'
      tagVersion:
        options:
          failOnError: false
          execOptions:
            cwd: 'dist'
        command: (theme, version) ->
          return 'git tag ' + version + '-' + theme + ' -m " ' + version + ' update" -f'
      pushChanges:
        options:
          stdout: false
          stderr: false
          execOptions:
            cwd: 'dist'

        command: (theme) ->
          return 'git push origin ' + theme + ' --tags -f'


  grunt.loadNpmTasks 'grunt-curl'
  grunt.loadNpmTasks 'grunt-http'
  grunt.loadNpmTasks 'grunt-shell'
  grunt.loadNpmTasks 'grunt-contrib-clean'


  grunt.registerTask 'updateJsonConf', 'Updates version of package.json and bower.json files ', () ->
    grunt.task.run 'clean:tmp'
    grunt.task.run 'shell:cloneProject:.tmp'
    grunt.registerTask 'writeJsonChanges', () ->
      content = pkg
      content.version = grunt.config.get 'update.version'
      grunt.file.write '.tmp/package.json', JSON.stringify(content, undefined, 2)
      bowerConf = grunt.config.get 'bowerConf'
      bowerConf.version = grunt.config.get 'update.version'
      grunt.file.write '.tmp/bower.json', JSON.stringify(bowerConf, undefined, 2)
    grunt.task.run 'writeJsonChanges'
    grunt.task.run 'shell:commitMaster'


  grunt.registerTask 'updateBowerJson', 'Updates version of bower.json for themes ', (theme) ->
    # read source json
    content = grunt.file.readJSON 'bower.json'
    content.version = grunt.config.get('update.version') + '-' + theme
    grunt.file.write 'dist/bower.json', JSON.stringify content, undefined, 2


  grunt.registerTask 'fetchBootstrapFiles', [
    'curl'
  ]


  grunt.registerTask 'release', () ->
    grunt.task.run 'shell:setUser'
    grunt.task.run 'clean:dist'
    grunt.task.run 'shell:cloneProject:dist'

    grunt.config.get('update.themes').forEach (theme) ->
      grunt.task.run 'shell:switchBranch:' + theme.name.toLowerCase()
      grunt.task.run 'shell:copyUpdate:' + theme.name.toLowerCase()
      grunt.task.run 'updateBowerJson:' + theme.name.toLowerCase()
      grunt.task.run 'shell:commitChanges'
      grunt.task.run 'shell:tagVersion:' + theme.name.toLowerCase() + ':' + grunt.config.get 'update.version'
      grunt.task.run 'shell:pushChanges:' + theme.name.toLowerCase()


  grunt.registerTask 'releaseNewThemes', () ->
    if grunt.config.get('update.newThemes').length > 0
      grunt.log.writeln 'Themes to release', grunt.config.get('update.newThemes').length
      grunt.config.set 'update.themes', grunt.config.get 'update.newThemes'
      grunt.task.run 'fetchBootstrapFiles'
      grunt.task.run 'release'
      grunt.task.run 'updateJsonConf'
    else
      grunt.log.write "All is well! Themes are up to date. Version: #{grunt.config.get 'bowerConf.version'}."


  grunt.registerTask 'checkThemes', () ->
    grunt.config.set 'update.newThemes', []

    themes = grunt.config.get 'update.themes'

    themes.forEach (theme) ->
      url = grunt.config.get('pkg.repository.rawUrl')  + '/' + theme.name.toLowerCase() + '/bower.json'

      grunt.config.set 'http.check' + theme.name + '.options.url', url
      grunt.config.set 'http.check' + theme.name + '.options.ignoreErrors', true
      grunt.config.set 'http.check' + theme.name + '.options.callback', (error, response, data) ->
        release = false
        data = JSON.parse data
        if response.statusCode is '404'
          release = true
          grunt.log.writeln 'New theme found: ' + theme.name
        else if data.version < grunt.config.get 'update.version'
          release = true
          grunt.log.writeln 'Theme out of date: ' + theme.name
        else
          grunt.log.writeln theme.name + ' up to date. (' + data.version + ')'

        if release is true
          # new theme release
          grunt.config.set 'http.fetch' + theme.name + '.options.url', theme.css
          grunt.config.set 'http.fetch' + theme.name + '.dest', 'update/' + theme.name.toLowerCase() + '/bootstrap.css'
          grunt.task.run 'http:fetch' + theme.name
          grunt.config.set 'http.fetch' + theme.name + 'Min.options.url', theme.cssMin
          grunt.config.set 'http.fetch' + theme.name + 'Min.dest', 'update/' + theme.name.toLowerCase() + '/bootstrap.min.css'
          grunt.task.run 'http:fetch' + theme.name + 'Min'
          newThemes = grunt.config.get 'update.newThemes'
          newThemes.push theme
          grunt.config.set 'update.newThemes', newThemes
      grunt.task.run 'http:check' + theme.name

  grunt.registerTask 'checkUpdate', [
    'http:bootswatch'
  ]

  # Default task
  grunt.registerTask 'default', [
    'checkUpdate'
  ]
