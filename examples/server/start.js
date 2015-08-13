'use strict'

var config = require('./config');
var SimpleVertecApi = require('simple-vertec-api').SimpleVertecApi;
var api = new SimpleVertecApi(config.vertec.url, config.vertec.username, config.vertec.password);
var restify = require('restify');
var server = restify.createServer();
var moment = require('moment');
var _ = require('lodash');

server.use(restify.queryParser());
server.use(restify.gzipResponse());
server.use(restify.bodyParser());
server.use(function crossOrigin(req,res,next){
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'X-Requested-With');
	res.charSet('utf-8');
	return next();
});

server.get('/alleleistungenvonheute', function(req, res, next) {
	var start_time = new Date().getTime();

	api.select(
		{
			ocl: 'Leistung',
			sqlwhere: "(datum >= {ts ':today 00:00:00'}) and (datum <= {ts ':today 23:59:59'})"
		},
		{
			today: moment().format('YYYY-MM-DD')
		},
		[
			'wertInt',
			'wertExt'
		]
	).then(function(response) {
		var offeneleistungen = response.OffeneLeistung ? response.OffeneLeistung : [];
		var verrechneteleistungen = response.VerrechneteLeistung ? response.VerrechneteLeistung : [];

		if (_.isPlainObject(offeneleistungen)) {
			offeneleistungen = [
				offeneleistungen
			];
		}

		if (_.isPlainObject(verrechneteleistungen)) {
			verrechneteleistungen = [
				verrechneteleistungen
			];
		}

		var alleleistungen = verrechneteleistungen.concat(offeneleistungen);

		res.json({
			requestTime: new Date().getTime() - start_time,
			total: alleleistungen.length,
			leistungen: alleleistungen
		});
	}).catch(function(e) {
		res.json(500, e);
	});
});

server.listen(8080, function() {
	console.log('%s listening at %s', server.name, server.url);
})