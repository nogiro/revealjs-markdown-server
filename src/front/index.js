const { Elm } = require('./elm/Index.elm');

var app = Elm.Index.init({
  node: document.getElementById('elm'),
  flags: flags,
});
