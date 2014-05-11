module.exports = function (grunt) {
  'use strict';
    // Project configuration
    grunt.loadNpmTasks('grunt-curl');

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
                  grunt.log.writeln('current version: ',grunt.config.get('pkg.bootswatch.version'));
                  if(grunt.config.get('pkg.bootswatch.version') < latestVersion) {
                    grunt.log.writeln('New version is available. Updating to: ' + latestVersion);
                    grunt.config.set('update.version', latestVersion);
                    grunt.config.set('update.themes', data.themes);
                    // fetch themes
                    data.themes.forEach(function(theme) {
                      // create dynamic http tasks and run them
                      grunt.config.set('http.fetch' + theme.name + '.options.url', theme.cssMin);
                      grunt.config.set('http.fetch' + theme.name + '.dest', grunt.config.get('update.destination') + theme.name.toLowerCase() + '/bootstrap.min.css');
                      grunt.task.run('http:fetch' + theme.name);
                    });
                    grunt.task.run('updatePackageJson');
                    grunt.tast.run('release');
                  }
                  else
                    grunt.log.write('Already have the latest version: ' + latestVersion);
                }
              }
            }
          }
        },
        shell: {
          setUser: {
            options: {
              stderr: false
            },
            command: 'git config --global user.name "Auto Update" && git config --global user.email "$GH_TOKEN"'
          },
          cloneProject: {
            options: {
              stderr: false
            },
            command: 'git clone ' + grunt.file.readJSON('package.json').repository.url + ' repo && cd repo'
          },
          switchBranch: {
            options: {
              stderr: false
            },
            command: 'git checkout {theme}'
          },
          copyUpdate: {
            options: {
              stderr: false
            },
            command: 'cp -f ../update/{theme}/bootstrap.min.css ./css && '+
                     'cp -Rf ../update/bootstrap/* .'
          },
          commitChanges: {
            options: {
              stderr: false
            },
            command: 'git add . && ' +
                     'commit -m "Auto update" && ' +
                     'git tag {version} -m "{version} update"' +
                     'git push origin {theme}'
          }
        }
    });

    grunt.loadNpmTasks('grunt-http');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('updatePackageJson', 'Updates version of package.json file ', function() {
      var content = grunt.file.readJSON('package.json');
      content.bootswatch.version = grunt.config.get('update.version');
      grunt.file.write('package.json', JSON.stringify(content, undefined, 2));
    });

    grunt.registerTask('updateBowerJson', 'Updates version of bower.json for themes ', function() {
      var content = grunt.file.readJSON('repo/bower.json');
      content.version = grunt.config.get('update.version');
      grunt.file.write('repo/bower.json', JSON.stringify(content, undefined, 2));
    });

    grunt.registerTask('checkUpdate', [
      'http:bootswatch'
    ]);

    // Default task
    grunt.registerTask('default', [
      'checkUpdate'
    ]);
  };
