## download and install
```
$ git clone https://github.com/nogiro/revealjs-markdown-server.git
$ cd revealjs-markdown-server
$ npm install
$ npm run build
```

## start
`npm start`, then visit `http://<host>:3000/`.

### options
See `npm start -- --help`.

## add slide
Place `*.md` into `resource/md/` (or specified `<path>/md/` by `-d <path>`).

## Docker support
```
$ git clone https://github.com/nogiro/revealjs-markdown-server.git
$ cd revealjs-markdown-server
$ docker build .
$ docker run -v /path/to/resource:/resource -p 3000:3000 <image id>
```

