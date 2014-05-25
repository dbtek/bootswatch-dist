bootswatch-dist [![Build Status](https://travis-ci.org/dbtek/bootswatch-dist.svg?branch=master)](https://travis-ci.org/dbtek/bootswatch-dist) ![node-dependencies](https://david-dm.org/dbtek/bootswatch-dist.png)
===============

Distribution packages for bootswatch themes for Bower package manager.
Bootswatch themes, updated from Bootswatch API and placed in a particular branch. Themes are managed through versions. See below.

##Install 
Every theme is released with versions. For example Yeti theme is released with `3.1.1-yeti` version identifier.
With bootswatch-dist, Bootswatch themes can be easily installed via bower.

####From Terminal
```bash
$ bower install bootswatch-dist#3.1.1-yeti
```

####With bower.json
```js
  ...
  "dependencies": {
    "bootswatch-dist": "3.1.1-yeti"
  }
```

###Available versions:
```
- bootswatch-dist
  - 3.1.1-yeti
  - 3.1.1-united
  - 3.1.1-superhero
  - 3.1.1-spacelab
  - 3.1.1-slate
  - 3.1.1-simplex
  - 3.1.1-readable
  - 3.1.1-lumen
  - 3.1.1-journal
  - 3.1.1-flatly
  - 3.1.1-darkly
  - 3.1.1-cyborg
  - 3.1.1-cosmo
  - 3.1.1-cerulean
  - 3.1.1-amelia
```  


##Clean Distribution

Bootswatch dist provides you clean and full Bootstrap installation. Produced files for 3.1.1-yeti are:

```
bootswatch-dist/
  bower.json
  css/
    bootstrap.min.css
  fonts/
    glyphicons-halflings-regular.eot
    glyphicons-halflings-regular.svg
    glyphicons-halflings-regular.ttf
    glyphicons-halflings-regular.woff
  js/
    bootstrap.min.js
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






