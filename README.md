bootswatch-dist [![Build Status](https://travis-ci.org/dbtek/bootswatch-dist.svg?branch=master)](https://travis-ci.org/dbtek/bootswatch-dist) ![node-dependencies](https://david-dm.org/dbtek/bootswatch-dist.png)
===============

Distribution packages for Bootswatch themes, intended to be used with Bower package manager. Bootswatch themes are amazing for users; with bootswatch-dist they are also delicious for you, developers!

##How?
Bootswatch themes are updated from Bootswatch API and placed in a particular branch here, in this repo, with Bootstrap scripts, glyphicon fonts and a proper bower configuration. These themes are managed through both versions and branches.  
bootswatch-dist packages are updated on daily periods with a build system connecting Bootswatch API.

##Install 
Every theme is released with versions. For example `3.3.0` version of Yeti theme is released with `3.3.0-yeti` version identifier on branch `yeti`. Therefore, both tags and branch names can be used while installing a theme through bower.
With bootswatch-dist, Bootswatch themes are easily installed via bower.

####From Terminal
For exact version use tag:
```bash
$ bower install bootswatch-dist#3.3.0-yeti
```

For latest version use branch:
```bash
$ bower install bootswatch-dist#yeti
```

####With bower.json
Again for exact version:
```js
  ...
  "dependencies": {
    "bootswatch-dist": "3.3.0-yeti"
  }
```
And for latest version:
```js
  ...
  "dependencies": {
    "bootswatch-dist": "yeti"
  }
```

###Available Versions
Run `$ bower info bootswatch-dist` for available versions. All 3.1.1+ versions are available through bower.


##Clean Distribution
Bootswatch dist provides you clean and full Bootstrap installation. Produced files are:

```
bootswatch-dist/
├── bower.json
├── css
│   ├── bootstrap.css
│   └── bootstrap.min.css
├── fonts
│   ├── glyphicons-halflings-regular.eot
│   ├── glyphicons-halflings-regular.svg
│   ├── glyphicons-halflings-regular.ttf
│   ├── glyphicons-halflings-regular.woff
│   └── glyphicons-halflings-regular.wof2
└── js
    ├── bootstrap.js
    └── bootstrap.min.js
```

##Author
İsmail Demirbilek - [@dbtek](http://twitter.com/dbtek)

##License
[MIT](http://opensource.org/licenses/MIT)

##Credits

- [Bootswatch](http://bootswatch.com)  
- [Bootstrap](http://getbootstrap.com)  
- [Bootstrap CDN](http://bootstrapcdn.com)  
- [Grunt](http://gruntjs.com/)
- Some other great open source tools.

