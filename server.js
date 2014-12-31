#!/usr/bin/env node

var Promise = require('bluebird')
	, connect = require('connect')
	, http = require('http')
	, marked = require('marked')
	, less = require('less')
	, fs = require('fs')
	, send = require('send')
	, flags = require('commander')
	, jsdom = require('jsdom')
	, ansi = require('ansi')
  , cursor = ansi(process.stdout)
	;


flags
  .version('0.0.8')
  .option('-h, --home [type]', 'Serve from directory [home]', './')
  .option('-p, --port [type]', 'Serve on port [port]', '8080')
  .parse(process.argv);
	;

	var dir = flags.home
		, scriptPath = __dirname+'/script/script.js'
		, cssPath = __dirname+'/less/github.less'
		;

	var app = connect().use('/', onRequest);
	
	var server = http.createServer(app).listen(flags.port);

	function msg(type){
		return cursor
			.bg.rgb(128, 255, 0)
			.fg.rgb(0,0,0)
			.write(' markserv ')
			.reset()
			.fg.rgb(200,200,200)
			.write(' '+type+': ')
			.reset()
			;
	}


	
	var startMsg = 'serving content from "'+flags.home+'" on port: '+flags.port;
	msg('start')
		.write('serving content from ')
		// .fg.rgb(0,128,255)
		.fg.rgb(255,255,255)
		.write(flags.home)
		.reset()
		.write(' on port: ')
		// .fg.rgb(0,128,255)
		.fg.rgb(255,255,255)
		.write(flags.port)
		.reset()
		.write('\n')
		;

	var address = server.address();


	msg('address')
		.underline()
		// .fg.rgb(128,255,0)
		.fg.rgb(255,255,255)
		.write('http://'+address.address+':'+address.port)
		.reset()
		.write('\n')
		;



	var io = require('socket.io')(server);

	function getFile(path){
		return new Promise(function (resolve, reject) {
			fs.readFile(path, 'utf8', function(err, data){
				if (err) return reject(err);
				resolve(data);
			});
		});
	}
	
	// Converts github style wiki markdown links to .md links
  function linkify(body){
		return new Promise(function (resolve, reject) {	
			jsdom.env(body, function (err, window) {
				if (err) return reject(err);

			  var links = window.document.getElementsByTagName('a')
			  	, i=0
			  	, l=links.length
			  	, href
			  	, link
			  	, markdownFile
          , mdFileExists
          , relativeURL
			  	;

			  for (; i< l; i++) {
			  	link = links[i];
			  	href = link.href;
			  	isFileHref = href.substr(0,8) ==='file:///';

          markdownFile = href.replace('file://'+__dirname, flags.home)+'.md';
          mdFileExists = fs.existsSync(markdownFile);

          if (isFileHref && mdFileExists) {
			  	  relativeURL = href.replace('file://'+__dirname, '')+'.md';
            link.href=relativeURL;
			  		// console.log(relativeUrl);
			  	}
			  }

			  var html = window.document.getElementsByTagName('body')[0].innerHTML;

			  resolve(html);
			});
		});
	}

	function buildHTMLFromMarkDown(markdownPath){
		return new Promise(function (resolve, reject) {
			var css, body;

			getFile(cssPath)
			.then(less.render)
			.then(function(data){
				
				css = data.css;
				var filePath = markdownPath.split('?')[0];
				getFile(filePath).then(function(data){
				return markdownToHTML(data);

			})
			.then(linkify)
			.then(function(data){
				
					body = data;
		//jsdom
					//
					
					
					getFile(scriptPath).then(function(script){

						var dirs = markdownPath.split('/');
						title = dirs[dirs.length-1].split('.md')[0];
						// console.log(title);

						var html = '<!DOCTYPE html>' +
							'<head>' +
							'<title>'+title+'</title>' +
							'<meta charset="utf-8">' +
							// '<script src="https://code.jquery.com/jquery-2.1.1.min.js"></script>'+
							'<script src="https://code.jquery.com/jquery-1.11.1.min.js"></script>'+
						  '<script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/highlight.min.js"></script>'+
						  '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/styles/github.min.css">' +
							'<style>'+css+'</style>' +
							'<script src="/socket.io/socket.io.js"></script>' +
							'</head>' +
							'<body><article class="markdown-body">'+body+'</article></body>'+
							'<script>'+script+'</script>' +
							'';
						
						resolve(html);
					})
				})
			})
			.catch(function(err){
				reject(err);
			})
		});
	}

	function markdownToHTML(markdownText){
		return new Promise(function (resolve, reject) {
			marked(markdownText, function(err, data){
				if (err) return reject(err);
				resolve(data);
			});
		});
	}


	function onRequest(req, res, next){		
		msg('request')
		.write(dir+req.originalUrl)
		.reset()
		.write('\n')
		;

	  var path = dir+req.originalUrl.split('?')[0]
	  	, end = path.substr(path.length-3).toLowerCase()
	  	, isMarkdown = end === '.md'.toLowerCase()
	  	, isDir = fs.statSync(path).isDirectory()
	  	;
  	
	  if (isMarkdown) {
	  	msg('md-to-html').write(path).reset().write('\n');
	  	markItDown(path, res);
	  } else if (isDir) {
	  	var urls = fs.readdirSync(path);
	  	var html = '';
	  	
	  	urls.forEach(function(subPath){
	  		var dir = fs.statSync(path+subPath).isDirectory();
	  		var href;
	  		if (dir){
	  			href=subPath+'/';
	  		}else{
	  			href=subPath;
	  		}
	  		html+='<a href="'+href+'">'+href+'</a> <br> \n';
	  	})

	  	msg('index').write(path).reset().write('\n');
	  	res.writeHead(200, {'Content-Type': 'text/html'});
	  	res.write(html);
	  	res.end();

	  } else {
    	msg('serve-file').write(path).reset().write('\n');
    	send(req, path, {root:dir}).pipe(res);
	  }
	}


	function markItDown(path, res){
		buildHTMLFromMarkDown(path)
  	.then(function(html){

			res.writeHead(200);
			res.end(html);

			fs.watch(path, function () {
				msg('update').write(path).reset().write('\n');
			  io.sockets.emit('refresh', + new Date());
			});

  	}).catch(function(err){
  			msg('error').write('Can\'t build HTML: ',err).reset().write('\n');
  	});
	}

// Watch for style changes if running from package dir
fs.exists('./less', function(exists) {
    if (exists) {
		fs.watch('./less', function (curr, prev) {
		  io.sockets.emit('refresh', + new Date());
		});
    }
});




// var clients = {};

// io.on('connect', function(socket){
	// socket.emit('requestId');

	// socket.on('heresId', function(id){
	// 	if(clients[id]){
	// 		socket.emit('scrollTo', clients[id].scrollTop);
	// 	}else{
	// 		clients[id] = {scrollTop:0};
	// 	}
	// });

	// socket.on('scroll', function(data){
	// 	clients[data.id].scrollTop = data.scrollTop;
	// 	// console.log(data.scrollTop, data.id);
	// });
// });





