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
	connectLiveReload = require('connect-livereload');


// Path Variables

var GitHubStyle = __dirname+'/less/github.less',
	scriptPath = __dirname+'/script/script.js';

// Options


var r = flags.version(pkg.version)
  .option('-h, --home [type]', 'Serve from directory [home]', './')
  // .option('-a, --address [type]', 'Server from IP Address [0.0.0.0]', '0.0.0.0')
  .option('-p, --port [type]', 'Serve on port [port]', '8080')
  .option('-s, --less [type]', 'Path to Less styles [less]', GitHubStyle)
  .option('-f, --file [type]', 'Open specific file in browser [file]')
  .option('-v, --verbose', 'verbose output')
  .parse(process.argv);


var dir = flags.home,
	cssPath = flags.less;

// Servers: Connect / HTTP / LiveEeload

var app = connect()
	.use('/', onRequest)
	.use(connectLiveReload({port: 35729}));

var httpServer = http.createServer(app).listen(flags.port);
var address = httpServer.address();

var lrServer = liveReload.createServer({
  exts: markdownExtensions
}).watch(flags.home);


var urlSafeAddress = address.address === "::" ? "localhost" : address.address;
var serveURL = 'http://'+urlSafeAddress+':'+address.port;

if (flags.file){
  open(serveURL+'/'+flags.file);
} else {
  open(serveURL);
}



// Terminal Output Messages

function msg(type){
	return cursor
		.bg.rgb(64, 128, 0)
		.fg.rgb(0,0,0)
		.write(' Markserv ')
		.reset()
		.fg.rgb(200,200,200)
		.write(' '+type+': ')
		.reset()
		;
}


msg('start')
	.write('serving content from ')
	// .fg.rgb(0,128,255)
	.fg.rgb(255,255,255)
	.write(path.resolve(flags.home))
	.reset()
	.write(' on port: ')
	// .fg.rgb(0,128,255)
	.fg.rgb(255,255,255)
	.write(flags.port)
	.reset()
	.write('\n')
	;

msg('address')
	.underline()
	// .fg.rgb(128,255,0)
	.fg.rgb(255,255,255)
	.write(serveURL)
	.reset()
	.write('\n')
	;

var startMsg = 'serving content from "'+flags.home+'" on port: '+flags.port;
msg('less')
	.write('using style from ')
	// .fg.rgb(0,128,255)
	.fg.rgb(255,255,255)
	.write(flags.less)
	.reset()
	.write('\n')
	;


if (process.pid) {
  msg('process')
    .write('your pid is: ')
    .fg.rgb(255,255,255)
    .write(process.pid+'')
    .reset()
    .write('\n');
}

if (process.pid) {
  msg('info')
    .write('to stop this server, press: ')
    .fg.rgb(255,255,255)
    .write('[Ctrl + C]')
    .reset()
    .write(', or type: ')
    .fg.rgb(255,255,255)
    .write('"kill '+process.pid+'"')
    .reset()
    .write('\n');
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

				if(flags.less === GitHubStyle){
					html = '<!DOCTYPE html>' +
						'<head>' +
						'<title>'+title+'</title>' +
						'<meta charset="utf-8">' +
						'<script src="https://code.jquery.com/jquery-1.11.1.min.js"></script>'+
					    '<script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/highlight.min.js"></script>'+
					    '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/styles/github.min.css">' +
					    '<link rel="shortcut icon" type="image/x-icon" href="https://cdn0.iconfinder.com/data/icons/octicons/1024/markdown-128.png" />' +
						'<style>'+css+'</style>' +
						'</head>' +
						'<body><article class="markdown-body">'+body+'</article></body>'+
						'<script src="http://localhost:35729/livereload.js?snipver=1"></script>';
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



// onRequest: handles all the browser requests

function onRequest(req, res, next){
	if (flags.verbose){
    msg('request')
  	 .write(dir+req.originalUrl)
  	 .reset().write('\n');
  }

  var path = dir+req.originalUrl;
  var isDir = fs.statSync(path).isDirectory();
  var isMarkdown = false;

  if(!isDir){
    isMarkdown = hasMarkdownExtension(path);
  }


  // Markdown: Browser is requesting a Markdown file...

  if (isMarkdown) {

  	if (flags.verbose){
      msg('markdown-to-html').write(path).reset().write('\n');
    }
  	compileAndSend(path, res);


  // Index: Browser is requesting a Directory Index...

  } else if (isDir) {

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
			'<title>'+path+'</title>' +
			'<meta charset="utf-8">' +
			'<script src="https://code.jquery.com/jquery-1.11.1.min.js"></script>'+
		  '<script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/highlight.min.js"></script>'+
		  '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/styles/github.min.css">' +
		  '<link rel="shortcut icon" type="image/x-icon" href="https://cdn0.iconfinder.com/data/icons/octicons/1024/markdown-128.png" />' +
			'<style>'+customCSSforMarkdown+'</style>' +
			'</head>' +
			'<body>'+
				'<article class="markdown-body">'+
					'<h1>Index of '+path+'</h1>'+
					list+
					'<sup> <hr> Served by <a href="https://www.npmjs.com/package/markserv">MarkServ</a> </sup>'+
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
  	if (flags.verbose){
      msg('serve-file').write(path).reset().write('\n');
    }

  	send(req, path, {root:dir}).pipe(res);
  }
}