const { Elm } = require('./elm/Index.elm');

var app = Elm.Main.init({
  node: document.getElementById('elm'),
  flags: flags,
});
