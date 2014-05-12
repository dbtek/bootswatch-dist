'use strict';

module.exports = function (grunt) {
  grunt.initConfig({
    // Metadata
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
    '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
    '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
    '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
    ' Licensed <%= props.license %> */\n',
    // Task configuration
    gruntfile: {
      src: 'gruntfile.js'
    },
    // shared config between update tasks
    update: {
      destination: 'update/',
      version: ''
    },
    curl: {
      // Bootstrap files
      'update/bootstrap/js/bootstrap.min.js': 'http://netdna.bootstrapcdn.com/bootstrap/latest/js/bootstrap.min.js',
      'update/bootstrap/fonts/glyphicons-halflings-regular.eot': 'http://netdna.bootstrapcdn.com/bootstrap/latest/fonts/glyphicons-halflings-regular.eot',
      'update/bootstrap/fonts/glyphicons-halflings-regular.woff': 'http://netdna.bootstrapcdn.com/bootstrap/latest/fonts/glyphicons-halflings-regular.woff',
      'update/bootstrap/fonts/glyphicons-halflings-regular.ttf': 'http://netdna.bootstrapcdn.com/bootstrap/latest/fonts/glyphicons-halflings-regular.ttf',
      'update/bootstrap/fonts/glyphicons-halflings-regular.svg': 'http://netdna.bootstrapcdn.com/bootstrap/latest/fonts/glyphicons-halflings-regular.svg'
    },
    http: {
      bootswatch: {
        options: {
          url: 'http://api.bootswatch.com/3/',
          callback: function(error, response, data) {
            data = JSON.parse(data);
            if(error)
              grunt.log.error('Something went wrong. Can\'t reach Bootswatch API');
            else {
              var latestVersion = data.version;
              grunt.config.set('update.version', latestVersion);
              grunt.config.set('update.themes', data.themes);
              grunt.log.writeln('Current version: ',grunt.config.get('pkg.bootswatch.version'));
              if(grunt.config.get('pkg.bootswatch.version') < latestVersion) {
                grunt.log.writeln('New version is available. Updating to: ' + latestVersion);
                // fetch themes
                data.themes.forEach(function(theme) {
                  // create dynamic http tasks and run them
                  grunt.config.set('http.fetch' + theme.name + '.options.url', theme.cssMin);
                  grunt.config.set('http.fetch' + theme.name + '.dest', 'update/'+ theme.name.toLowerCase() + '/bootstrap.min.css');
                  grunt.task.run('http:fetch' + theme.name);
                });
                grunt.task.run('fetchBootstrapFiles');
                grunt.task.run('release');
                grunt.task.run('updatePackageJson');
              }
              else {
                grunt.task.run('checkThemes');
                grunt.task.run('releaseNewThemes');
                grunt.task.run('updatePackageJson');
              }
            }
          }
        }
      }
    },
    clean: {
      dist: {
        src: ['dist']
      }
    },
    shell: {
      setUser: {
        options: {
          stdout: false
        },
        command: 'git config --global user.name "Travis Build" && git config --global user.email "$GH_TOKEN"'
      },
      cloneProject: {
        options: {
          stdout: false
        },
        command: 'git clone https://$GH_TOKEN@' + grunt.file.readJSON('package.json').repository.url.split('://')[1] + ' dist'
      },
      createBranch: {
        options: {
          execOptions: {
            cwd: 'dist'
          }
        },
        command: function (theme) {
          return 'git checkout --orphan ' + theme + ' && rm -rf * .gitignore .travis.yml';
        }
      },
      switchBranch: {
        options: {
          failOnError: true,
          callback: function(err, stdout, stderr, cb) {
            if(err) {
              grunt.task.run('shell:createBranch:' + this.args[0]);
            }
            cb();
          },
          execOptions: {
            cwd: 'dist'
          }
        },
        command: function (theme) {
          return 'git checkout ' + theme;
        }
      },
      copyUpdate: {
        options: {
        },
        command:  function (theme) {
          return 'mkdir dist/css && ' +
                 'cp -f update/' + theme + '/bootstrap.min.css dist/css/bootstrap.min.css && ' +
                 'cp -Rf update/bootstrap/* dist';
        }
      },
      commitChanges: {
        options: {
          failOnError: false,
          execOptions: {
            cwd: 'dist'
          }
        },
        command: 'git add . --all && ' +
                 'git commit -m "Auto update [ci skip]"'
      },
      tagVersion: {
        options: {
          failOnError: false,
          execOptions: {
            cwd: 'dist'
          }
        },
        command: function(theme, version) {
          return 'git tag ' + version + '-' + theme + ' -m " ' + version + ' update" -f && ' +
                 'git push origin ' + theme;
        }
      },
      pushChanges: {
        options: {
          stdout: false,
          execOptions: {
            cwd: 'dist'
          }
        },
        command: function(theme) {
          return 'git push origin ' + theme + ' --tags';
        }
      },
      commitPackageJson: {
        options: {
          failOnError: false,
          stdout: false
        },
        command: 'git add package.json && ' +
                 'git commit -m "Auto update [ci skip]" && ' +
                 'git push origin master'
      }
    }
  });

  grunt.loadNpmTasks('grunt-curl');
  grunt.loadNpmTasks('grunt-http');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('updatePackageJson', 'Updates version of package.json file ', function() {
    var content = grunt.file.readJSON('package.json');
    content.bootswatch.version = grunt.config.get('update.version');
    grunt.file.write('package.json', JSON.stringify(content, undefined, 2));
  });

  grunt.registerTask('createBowerJson', 'Creates a bower.json for new themes ', function() {
    // read bower template
    var content = grunt.file.readJSON('bower.json');
    content.version = grunt.config.get('update.version');
    grunt.file.write('dist/bower.json', JSON.stringify(content, undefined, 2));
  });

  grunt.registerTask('updateBowerJson', 'Updates version of bower.json for themes ', function(theme) {
    if(grunt.file.exists('dist/bower.json')) {
      var content = grunt.file.readJSON('dist/bower.json');
      content.version = grunt.config.get('update.version') + '-' + theme;
      grunt.file.write('dist/bower.json', JSON.stringify(content, undefined, 2));
      grunt.task.run('shell:commitPackageJson');
    }
    else // file not found create one
      grunt.task.run('createBowerJson');
  });

  grunt.registerTask('fetchBootstrapFiles', [
    'curl'
  ]);

  grunt.registerTask('release', '', function() {
    grunt.task.run('shell:setUser');
    grunt.task.run('clean:dist');
    grunt.task.run('shell:cloneProject');

    grunt.config.get('update.themes').forEach(function(theme) {
      grunt.task.run('shell:switchBranch:'+theme.name.toLowerCase());
      grunt.task.run('shell:copyUpdate:'+theme.name.toLowerCase());
      grunt.task.run('updateBowerJson:'+theme.name.toLowerCase());
      grunt.task.run('shell:commitChanges');
      grunt.task.run('shell:tagVersion:' + theme.name.toLowerCase() + ':' + grunt.config.get('update.version'));
      grunt.task.run('shell:pushChanges:' + theme.name.toLowerCase());
    });
  });

  grunt.registerTask('releaseNewThemes', function() {
    grunt.log.writeln;('themes to release',grunt.config.get('update.newThemes').length);
    if(grunt.config.get('update.newThemes').length > 0) {
      grunt.config.set('update.themes', grunt.config.get('update.newThemes'));
      grunt.task.run('fetchBootstrapFiles');
      grunt.task.run('release');
    }
    else
      grunt.log.write('All themes up to date. Version: ' + grunt.config.get('pkg.bootswatch.version'));
  })

  grunt.registerTask('checkThemes', '', function() {

    grunt.config.set('update.newThemes', []);
    grunt.config.get('update.themes').forEach(function(theme) {
      var url = grunt.config.get('pkg.repository.rawUrl') + '/' + theme.name.toLowerCase() + '/bower.json';

      grunt.config.set('http.check' + theme.name + '.options.url', url);
      grunt.config.set('http.check' + theme.name + '.options.ignoreErrors', true);
      grunt.config.set('http.check' + theme.name + '.options.callback', function(error, response, data) {
        var release = false;
        if(response.statusCode == '404') {
          release = true;
          grunt.log.writeln('New theme found: ' + theme.name);
        }
        else if(data.version < grunt.config.get('update.version')) {
          release = true;
          grunt.log.writeln('Theme out of date: ' + theme.name);
        }

        if(release) {
          // new theme release
          grunt.config.set('http.fetch' + theme.name + '.options.url', theme.cssMin);
          grunt.config.set('http.fetch' + theme.name + '.dest', 'update/' + theme.name.toLowerCase() + '/bootstrap.min.css');
          grunt.task.run('http:fetch' + theme.name);
          var newThemes = grunt.config.get('update.newThemes');
          newThemes.push(theme);
          grunt.config.set('update.newThemes', newThemes);
        }
      });
      grunt.task.run('http:check' + theme.name);
    });
  });

  grunt.registerTask('checkUpdate', [
    'http:bootswatch'
  ]);

  // Default task
  grunt.registerTask('default', [
    'checkUpdate'
  ]);
};
