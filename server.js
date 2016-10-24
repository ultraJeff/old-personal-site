/* global console */
var path = require('path');
var express = require('express');
// Helmet provides HTTP headers for added security to Express
var helmet = require('helmet');
// Body Parser parses various MIME types
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
// Moonboots provides browerify, uglify, caching, and many build tool tasks
// So instead of Gulp needing to run, Moonboots can handle similar tasks per page load
var Moonboots = require('moonboots-express');
// Compression provides gzip header
var compress = require('compression');
// Get Config is from &yet and seeks to make env vars easier to deal with
var config = require('getconfig');
// Semi-static will render static Jade templates from Express easily
var semiStatic = require('semi-static');
// serve-static serves up static files... seems unnecessary?
var serveStatic = require('serve-static');
// Stylizer works with Moonboots to handle Stylus files on the fly
var stylizer = require('stylizer');
// Templatizer is a very fast Jade templating engine that
// turns a folder full of jade templates into a CommonJS
// module that exports all the template functions in client/templates.js
var templatizer = require('templatizer');

// a little helper for fixing paths for various environments
var fixPath = function (pathString) {
    return path.resolve(path.normalize(pathString));
};

// -----------------
// Call express
// -----------------
var app = express();

// -----------------
// Configure express
// -----------------
app.set('view engine', 'jade');
// Port HAS to be set to process.env.PORT for the app
// to work on Heroku!
app.set('port', (process.env.PORT || config.http.port));

app.use(compress());
app.use(serveStatic(fixPath('public')));
//app.use(express.static(__dirname + '/public'));

// we only want to expose tests in dev
if (config.isDev) {
    app.use(serveStatic(fixPath('test/assets')));
    app.use(serveStatic(fixPath('test/spacemonkey')));
}

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// in order to test this with spacemonkey we need frames
if (!config.isDev) {
    app.use(helmet.xframe());
}
app.use(helmet.xssFilter());
app.use(helmet.nosniff());


// views is directory for all template files
//app.set('views', __dirname + '/views');

//app.get('/', function(request, response) {
//  response.render('pages/index');
//});

// -----------------
// Set up our little demo API
// -----------------
var api = require('./fakeApi');
app.get('/api/people', api.list);
app.get('/api/people/:id', api.get);
app.delete('/api/people/:id', api.delete);
app.put('/api/people/:id', api.update);
app.post('/api/people', api.add);


// -----------------
// Enable the functional test site in development
// -----------------
if (config.isDev) {
    app.get('/test*', semiStatic({
        folderPath: fixPath('test'),
        root: '/test'
    }));
}

// -----------------
// Set our client config cookie
// -----------------
app.use(function (req, res, next) {
    res.cookie('config', JSON.stringify(config.client));
    next();
});


// ---------------------------------------------------
// Configure Moonboots to serve our client application
// ---------------------------------------------------
new Moonboots({
    moonboots: {
        jsFileName: 'locus-digitalis',
        cssFileName: 'locus-digitalis',
        main: fixPath('client/app.js'),
        developmentMode: config.isDev,
        libraries: [
        ],
        stylesheets: [
            fixPath('stylesheets/bootstrap.css'),
            fixPath('stylesheets/app.css')
        ],
        browserify: {
            debug: config.isDev
        },
        beforeBuildJS: function () {
            // This re-builds our template files from jade each time the app's main
            // js file is requested. Which means you can seamlessly change jade and
            // refresh in your browser to get new templates.
            if (config.isDev) {
                templatizer(fixPath('templates'), fixPath('client/templates.js'));
            }
        },
        beforeBuildCSS: function (done) {
            // This re-builds css from stylus each time the app's main
            // css file is requested. Which means you can seamlessly change stylus files
            // and see new styles on refresh.
            if (config.isDev) {
                stylizer({
                    infile: fixPath('stylesheets/app.styl'),
                    outfile: fixPath('stylesheets/app.css'),
                    development: true
                }, done);
            } else {
                done();
            }
        }
    },
    server: app
});


// listen for incoming http requests on the port as specified in our config
app.listen(app.get('port'), function() {
  console.log('Locus Digitalis is running at: http://localhost:' + app.get('port'));
});