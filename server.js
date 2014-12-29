#!/usr/bin/env node

var Promise = require('bluebird')
	, connect = require('connect')
	, http = require('http')
	, marked = require('marked')
	, less = require('less')
	, fs = require('fs')
	, send = require('send')
	, flags = require('commander')
	;




flags
  .version('0.0.4')
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

	console.log('MarkServ: serving content from "'+flags.home+'" on port: '+flags.port);



	var io = require('socket.io')(server);

	function getFile(path){
		return new Promise(function (resolve, reject) {
			fs.readFile(path, 'utf8', function(err, data){
				if (err) return reject(err);
				resolve(data);
			});
		});
	}
	function buildHTMLFromMarkDown(markdownPath){
		return new Promise(function (resolve, reject) {
			var css, body;

			getFile(cssPath).then(less.render).then(function(data){
				css = data.css;
			
				var filePath = markdownPath.split('?')[0];
				getFile(filePath).then(function(data){

					return markdownToHTML(data);
				}).then(function(data){
					body = data;

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
  		console.log('Request: '+ dir+req.originalUrl);

	  var path = dir+req.originalUrl.split('?')[0]
	  	, end = path.substr(path.length-3).toLowerCase()
	  	, isMarkdown = end === '.md'.toLowerCase()
	  	;
  	
	  if (isMarkdown) {
	  	markItDown(path, res);
	  } else {
    	send(req, path, {root:dir}).pipe(res);
	  }
	}


	function markItDown(path, res){
		buildHTMLFromMarkDown(path)
  	.then(function(html){

			res.writeHead(200);
			res.end(html);

			fs.watch(path, function () {
				console.log(arguments);
			  io.sockets.emit('refresh', + new Date());
			});

  	}).catch(function(err){
  			console.log('Error building HTML: ', err);
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





