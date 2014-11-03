bootswatch-dist [![Build Status](https://travis-ci.org/dbtek/bootswatch-dist.svg?branch=master)](https://travis-ci.org/dbtek/bootswatch-dist) ![node-dependencies](https://david-dm.org/dbtek/bootswatch-dist.png)
===============

Distribution packages for Bootswatch themes intended to be used with Bower package manager.
Bootswatch themes are updated from Bootswatch API and placed in a particular branch with Bootstrap scripts and a proper Bower configuration. These themes are managed through versions. See below.

##Install 
Every theme is released with versions. For example latest Yeti theme is released with `3.3.0-yeti` version identifier.
With bootswatch-dist, Bootswatch themes can be easily installed via bower.

####From Terminal
```bash
$ bower install bootswatch-dist#3.2.0-yeti
```

####With bower.json
```js
  ...
  "dependencies": {
    "bootswatch-dist": "3.3.0-yeti"
  }
```

###Available versions:
```
- bootswatch-dist
  - 3.3.0-amelia
  - 3.3.0-cerulean
  - 3.3.0-cosmo
  - 3.3.0-cyborg
  - 3.3.0-darkly
  - 3.3.0-flatly
  - 3.3.0-journal
  - 3.3.0-lumen
  - 3.3.0-paper
  - 3.3.0-readable
  - 3.3.0-sandstone
  - 3.3.0-simplex
  - 3.3.0-slate
  - 3.3.0-spacelab
  - 3.3.0-superhero
  - 3.3.0-united
  - 3.3.0-yeti
  - All 3.1.1+ versions
```  


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
│   └── glyphicons-halflings-regular.woff
└── js
    ├── bootstrap.js
    └── bootstrap.min.js
```

##Updates
bootswatch-dist packages updated instantly with a build system connecting Bootswatch API.

##Author
İsmail Demirbilek - [@dbtek](http://twitter.com/dbtek)

##License
[MIT](http://opensource.org/licenses/MIT)

##Credits

- [Bootswatch](http://bootswatch.com)  
- [Bootstrap](http://getbootstrap.com)  
- [Bootstrap CDN](http://bootstrapcdn.com)  
- Some other great open source tools.
