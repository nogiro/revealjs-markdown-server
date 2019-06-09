const { Elm } = require('./elm/Main.elm');

var app = Elm.Main.init({
  node: document.getElementById('elm'),
  flags: flags,
});
