'use strict'

var config = require('./config');
var SimpleVertecApi = require('simple-vertec-api').SimpleVertecApi;
var api = new SimpleVertecApi(config.vertec.url, config.vertec.username, config.vertec.password);
var restify = require('restify');
var server = restify.createServer();

server.use(restify.queryParser());
server.use(restify.gzipResponse());
server.use(restify.bodyParser());
server.use(function crossOrigin(req,res,next){
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'X-Requested-With');
	res.charSet('utf-8');
	return next();
});

server.listen(8080, function() {
	console.log('%s listening at %s', server.name, server.url);
});