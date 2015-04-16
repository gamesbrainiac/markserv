#!/usr/bin/env node


// Markdown Extension Types

var markdownExtensions = [
  '.markdown',
  '.mdown',
  '.mkdn',
  '.md',
  '.mkd',
  '.mdwn',
  '.mdtxt',
  '.mdtext',
  '.text'
];


var PORT_RANGE = {
  HTTP: [8000, 8100],
  LIVE_RELOAD: [35729, 35829]
};


// Requirements

var Promise = require('bluebird'),
	connect = require('connect'),
	http = require('http'),
  open = require("open"),
  path = require('path'),
	marked = require('marked'),
	less = require('less'),
	fs = require('fs'),
	send = require('send'),
	jsdom = require('jsdom'),
	ansi = require('ansi'),
  cursor = ansi(process.stdout),
	flags = require('commander'),
  pkg = require('./package.json'),
	liveReload = require('livereload'),
  openPort = require('openport'),
	connectLiveReload = require('connect-livereload');


// Path Variables

var GitHubStyle = __dirname+'/less/github.less',
	scriptPath = __dirname+'/script/script.js';

// Options


var r = flags.version(pkg.version)
  .option('-h, --home [type]', 'Serve from directory [home]', './')
  .option('-p, --port [type]', 'Serve on port [port]', '8080')
  .option('-s, --less [type]', 'Path to Less styles [less]', GitHubStyle)
  .option('-f, --file [type]', 'Open specific file in browser [file]')
  .option('-x, --x', 'Don\'t open browser on run.')
  .option('-v, --verbose', 'verbose output')
  .parse(process.argv);


var dir = flags.home,
	cssPath = flags.less;


var LIVE_RELOAD_PORT,
    LIVE_RELOAD_SERVER,
    HTTP_PORT,
    HTTP_SERVER,
    CONNECT_APP;


// Initialize MarkServ

findOpenPort(PORT_RANGE.LIVE_RELOAD)
  .then(setLiveReloadPort)
  .then(startConnectApp)
  .then(function(){
    findOpenPort(PORT_RANGE.HTTP)
    .then(setHTTPPort)
    .then(startHTTPServer)
    .then(startLiveReloadServer)
    .then(serversActivated);
  });


function findOpenPort(range){
  return new Promise(function (resolve, reject) {
    openPort.find({startingPort: range[0], endingPort: range[1]},
      function(err, port) {
        if(err) return reject(err);
        resolve(port);
      }
    );
  });
}

function setLiveReloadPort(port){
  return new Promise(function (resolve, reject) {
    LIVE_RELOAD_PORT = port;
    resolve(port);
  });
}

function setHTTPPort(port){
  return new Promise(function (resolve, reject) {
    HTTP_PORT = port;
    resolve(port);
  });
}

function startConnectApp(live_reload_port){
  return new Promise(function (resolve, reject) {
    CONNECT_APP = connect()
      .use('/', http_request_handler)
      .use(connectLiveReload({
        port: LIVE_RELOAD_PORT
      }));
    resolve(CONNECT_APP);
  });
}

function startHTTPServer(){
  return new Promise(function (resolve, reject) {
    HTTP_SERVER = http.createServer(CONNECT_APP);
    HTTP_SERVER.listen(HTTP_PORT);
    resolve(HTTP_SERVER)
  });
}


function startLiveReloadServer(){
  return new Promise(function (resolve, reject) {
    LIVE_RELOAD_SERVER = liveReload.createServer({
      exts: markdownExtensions,
      port: LIVE_RELOAD_PORT
    }).watch(flags.home);

    resolve(LIVE_RELOAD_SERVER);
  });
}

function serversActivated(){
  var address = HTTP_SERVER.address(); //|| {address:''};
  var urlSafeAddress = address.address === "::" ? "localhost" : address.address;
  var serveURL = 'http://'+urlSafeAddress+':'+HTTP_PORT;

  msg('start')
   .write('serving content from ')
   .fg.white().write(path.resolve(flags.home)).reset()
   .write(' on port: ')
   .fg.white().write(''+HTTP_PORT).reset()
   .write('\n');

  msg('address')
   .underline().fg.white()
   .write(serveURL).reset()
   .write('\n');

  var startMsg = 'serving content from "'+flags.home+'" on port: '+HTTP_PORT;

  msg('less')
   .write('using style from ')
   .fg.white().write(flags.less).reset()
   .write('\n');

  msg('livereload')
    .write('communicating on port: ')
    .fg.white().write(LIVE_RELOAD_PORT+'').reset()
    .write('\n');

  if (process.pid) {
    msg('process')
      .write('your pid is: ')
      .fg.white().write(process.pid+'').reset()
      .write('\n');

    msg('info')
      .write('to stop this server, press: ')
      .fg.white().write('[Ctrl + C]').reset()
      .write(', or type: ')
      .fg.white().write('"kill '+process.pid+'"').reset()
      .write('\n');
  }

  if (flags.file){
    open(serveURL+'/'+flags.file);
  } else {
    if (!flags.x){
      open(serveURL);
    }
  }
}









// Terminal Output Messages

function msg(type){
	return cursor
    .bg.green()
		.fg.black()
		.write(' Markserv ')
		.reset()
		.fg.white()
		.write(' '+type+': ')
		.reset()
		;
}


function boohoo(type){
  return cursor
    .bg.red()
    .fg.black()
    .write(' Markserv ')
    .reset()
    .write(' ')
    .fg.black()
    .bg.red()
    .write(' '+type+': ')
    .reset()
    .fg.red()
    .write(' ')
    ;
}




// getFile: reads utf8 content from a file

function getFile(path){
	return new Promise(function (resolve, reject) {
		fs.readFile(path, 'utf8', function(err, data){
			if (err) return reject(err);
			resolve(data);
		});
	});
}


// Get Custom Less CSS to use in all Markdown files

var customCSSforMarkdown;

getFile(cssPath)
  .then(function(data){
    less.render(data)
      .then(function(data){
	      customCSSforMarkdown = data.css;
      });
  });


// linkify: converts github style wiki markdown links to .md links

function linkify(body){
	return new Promise(function (resolve, reject) {
		jsdom.env(body, function (err, window) {
			if (err) return reject(err);

			var links = window.document.getElementsByTagName('a'),
				i=0,
				l=links.length,
				href,
				link,
				markdownFile,
				mdFileExists,
				relativeURL;

			for (; i< l; i++) {
				link = links[i];
				href = link.href;
				isFileHref = href.substr(0,8) ==='file:///';

			  markdownFile = href.replace('file://'+__dirname, flags.home)+'.md';
			  mdFileExists = fs.existsSync(markdownFile);

			  if (isFileHref && mdFileExists) {
				  relativeURL = href.replace('file://'+__dirname, '')+'.md';
			    link.href=relativeURL;
				}
			}

			var html = window.document.getElementsByTagName('body')[0].innerHTML;

		  resolve(html);
		});
	});
}


// buildHTMLFromMarkDown: compiles the final HTML/CSS output from Markdown/Less files, includes JS

function buildHTMLFromMarkDown(markdownPath){
	return new Promise(function (resolve, reject) {
		var css = customCSSforMarkdown, body;

		var filePath = markdownPath;
		getFile(filePath).then(function(data){
			return markdownToHTML(data);
		})
		.then(linkify)
		.then(function(data){

			body = data;

			getFile(scriptPath).then(function(script){

				var html;
				var dirs = markdownPath.split('/');
				title = dirs[dirs.length-1].split('.md')[0];
				// console.log(title);

				// Maybe use something like handlbars here?

        // console.log(GitHubStyle);

				if(flags.less === GitHubStyle){
					html = '<!DOCTYPE html>' +
						'<head>' +
						'<title>'+title+'</title>' +
						'<meta charset="utf-8">' +
            '<script src="https://code.jquery.com/jquery-2.1.1.min.js"></script>'+
            '<script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/highlight.min.js"></script>'+
            '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/styles/github.min.css">' +
						'<style>'+css+'</style>' +
						'</head>' +
						'<body><article class="markdown-body">'+body+'</article></body>'+
						'<script src="http://localhost:35729/livereload.js?snipver=1"></script>'+
            '<script>hljs.initHighlightingOnLoad();</script>';
				} else {
					html = '<!DOCTYPE html>' +
						'<head>' +
						'<title>'+title+'</title>' +
						'<meta charset="utf-8">' +
						'<style>'+customCSSforMarkdown+'</style>' +
						'</head>' +
						'<body>'+
							'<article class="markdown-body">'+
								body +
						 	'</article>'+
						 '</body>'+
						'<script src="http://localhost:35729/livereload.js?snipver=1"></script>';
				}

				resolve(html);
			});
		});
	});
}


// markdownToHTML: turns a Markdown file into HTML content

function markdownToHTML(markdownText){
	return new Promise(function (resolve, reject) {
		marked(markdownText, function(err, data){
			if (err) return reject(err);
			resolve(data);
		});
	});
}


// markItDown: begins the Markdown compilation process, then sends result when done...

function compileAndSend(path, res){
	buildHTMLFromMarkDown(path)
  .then(function(html){
  	res.writeHead(200);
		res.end(html);

	// Catch if something breaks...
	}).catch(function(err){
		msg('error')
		.write('Can\'t build HTML: ', err)
		.reset().write('\n');
	});
}



// hasMarkdownExtension: check whether a file is Markdown type

function hasMarkdownExtension(path){
  var fileExtension = path.substr(path.length-3).toLowerCase()
    extensionMatch = false;

  markdownExtensions.forEach(function(extension){
    if (extension === fileExtension){
      extensionMatch = true;
    }
  });

  return extensionMatch;
}



// http_request_handler: handles all the browser requests

function http_request_handler(req, res, next){

  if (flags.verbose){
    msg('request')
  	 .write(unescape(dir)+unescape(req.originalUrl))
  	 .reset().write('\n');
  }

  var path = unescape(dir)+unescape(req.originalUrl);

  try{
    var stat = fs.statSync(path);
    var isDir = stat.isDirectory();
    var isMarkdown = false;
    if (!isDir) {
      isMarkdown = hasMarkdownExtension(path);
    }
  }catch(e){
    res.writeHead(200, {'Content-Type': 'text/html'});
    boohoo('404').write(path.slice(2)).reset().write('\n');
    res.write("404 :'(");
    res.end();
    return;
  }
  // Markdown: Browser is requesting a Markdown file...

  if (isMarkdown) {

  	// if (flags.verbose){
    msg('markdown').write(path.slice(2)).reset().write('\n');
    // }
  	compileAndSend(path, res);


  // Index: Browser is requesting a Directory Index...

  } else if (isDir) {

    msg('dir').write(path.slice(2)).reset().write('\n');

  	var urls = fs.readdirSync(path);
  	var list = '<ul>\n';

  	urls.forEach(function(subPath){
  		var dir = fs.statSync(path+subPath).isDirectory();
  		var href;
  		if (dir){
  			href=subPath+'/';
  			list+='\t<li class="dir"><a href="'+href+'">'+href+'</a></li> \n';
  		}else{
  			href=subPath;

  			if(subPath.split('.md')[1]===''){
  				list+='\t<li class="md"><a href="'+href+'">'+href+'</a></li> \n';
  			}else{
  				list+='\t<li class="file"><a href="'+href+'">'+href+'</a></li> \n';
  			}
  		}
  	});

  	list += '</ul>\n';

  	var html = '<!DOCTYPE html>' +
			'<head>' +
			'<title>'+(path.slice(2))+'</title>' +
			'<meta charset="utf-8">' +
			// '<script src="https://code.jquery.com/jquery-1.11.1.min.js"></script>'+
      '<script src="https://code.jquery.com/jquery-2.1.1.min.js"></script>'+//
		  '<script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/highlight.min.js"></script>'+
		  '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/styles/default.min.css">' +
      '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/styles/github.min.css">' +
		  '<link rel="shortcut icon" type="image/x-icon" href="https://cdn0.iconfinder.com/data/icons/octicons/1024/markdown-128.png" />' +
			'<style>'+customCSSforMarkdown+'</style>' +
			'</head>' +
			'<body>'+
				'<article class="markdown-body">'+
					'<h1>Index of '+(path.slice(2))+'</h1>'+
					list+
					'<sup><hr> Served by <a href="https://www.npmjs.com/package/markserv">MarkServ</a> | '+process.pid+'</sup>'+
			 	'</article>'+
			 '</body>'+
			'<script src="http://localhost:35729/livereload.js?snipver=1"></script>';

  	// Log if verbose

  	if (flags.verbose){
      msg('index').write(path).reset().write('\n');
    }

    // Send file
    res.writeHead(200, {'Content-Type': 'text/html'});
  	res.write(html);
  	res.end();

  // Other: Browser is requesting a default Mime typed file... (mime type handled by 'send')

  } else {
  	// if (flags.verbose){
      msg('file').write(path.slice(2)).reset().write('\n');
    // }

  	send(req, path, {root:dir}).pipe(res);
  }
}