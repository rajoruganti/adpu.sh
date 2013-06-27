#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs'),
	path = require('path'),
	passport = require('passport'),
	TwitterStrategy = require('passport-twitter').Strategy,
	LocalStrategy = require('passport-local').Strategy,
	ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn,
	flash = require('connect-flash');
routes = require('./routes/index');



var PromoApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP || process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_INTERNAL_PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        // Routes for /health, /asciimo, /env and /
        self.routes['/health'] = function(req, res) {
            res.send('1');
        };

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/env'] = function(req, res) {
            var content = 'Version: ' + process.version + '\n<br/>\n' +
                          'Env: {<br/>\n<pre>';
            //  Add env entries.
            for (var k in process.env) {
               content += '   ' + k + ': ' + process.env[k] + '\n';
            }
            content += '}\n</pre><br/>\n'
            res.send(content);
            res.send('<html>\n' +
                     '  <head><title>Node.js Process Env</title></head>\n' +
                     '  <body>\n<br/>\n' + content + '</body>\n</html>');
        };

        
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
		self.app=express();
		passport.serializeUser(function(user, done) {
		  done(null, user);
		});

		passport.deserializeUser(function(obj, done) {
		  done(null, obj);
		});

		self.app.configure(function () {

			    self.app.use(express.logger('dev'));  /* 'default', 'short', 'tiny', 'dev' */
			    self.app.use(express.bodyParser()),
			    self.app.use(express.static(path.join(__dirname, 'public')));
				self.app.use(express.cookieParser());
				self.app.use(express.session({ secret: "topsecret" }));
				self.app.use(flash());
				self.app.use(passport.initialize());
				self.app.use(passport.session());
			});
		
		var TWITTER_CONSUMER_KEY = "gGwatU5a5uyGIk9DPK15tA";
		var TWITTER_CONSUMER_SECRET = "WnkuSYwFUAvQ8QMxhaWgipXknhg6wnvcELfWsB4v1YY";

	
		
		passport.use(new LocalStrategy(
			function(username, password, done) {
				db.collection("users", function(err, collection) {
					collection.findOne({username: username}, {}, function(err, user) {
						if (err) {
							console.log("error authenticating");
							return done(err, false); 
						}
						if (!user) { 
							console.log("no such user");
							return done(null, false,{
								message: 'Invalid username'
							});
						} 
						if (user.password != password) {
							// email was found case
							console.log('Invalid password');
							return done(null, false, {
								message: 'Invalid password'
							});
							
						}
						return done(null, user);
						
					});
				});
			}
		));
		
			self.app.get('/',routes.home);
			self.app.get('/login',routes.login);
			self.app.post('/login',
			  function(req, res, next) {
					console.log(req);
				
			    console.log('before authenticate:');
			    passport.authenticate('local', function(err, user, info) {
			      console.log('authenticate callback');
			      if (err) { return res.send({'status':'err','message':err.message}); }
			      if (!user) { return res.send({'status':'fail','message':info.message}); }
			      req.logIn(user, function(err) {
			        if (err) { return res.send({'status':'err','message':err.message}); }
			        return res.send({'status':'ok','message':'logged in'});
			      });
			    })(req, res, next);
			  },
			  function(err, req, res, next) {
			    // failure in login test route
			    return res.send({'status':'err','message':err.message});
			  });
			
			//self.app.post('/login', passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/', failureFlash:true }));
			self.app.get('/logout',routes.logout);
			self.app.get('/account',ensureLoggedIn('/'),routes.account);
			self.app.get('/auth/twitter', passport.authenticate('twitter'));
			self.app.get('/auth/twitter/signin/callback', passport.authenticate('twitter', { successReturnToOrRedirect: '/account', failureRedirect: '/login' }));
			self.app.get('/register/:id', routes.register);
			self.app.post('/register', routes.doRegister);
			self.app.get('/profile', ensureLoggedIn('/'), routes.profile);
			self.app.get('/dashboard', ensureLoggedIn('/'), routes.dashboard);
			self.app.get('/campaigns', ensureLoggedIn('/'), routes.campaigns);
//			self.app.get('/campaign/:id', ensureLoggedIn('/'), routes.getCampaign);
			self.app.post('/campaign/update', ensureLoggedIn('/'), routes.updateCampaign);
			self.app.get('/infects/:id', ensureLoggedIn('/'), routes.getInfects);
			self.app.get('/fb/:id', routes.fb);
			self.app.get('/tw/:id', routes.tw);
			self.app.get('/auth/twitter/callback', routes.twCallback);
			self.app.get('/do/:id', routes.doPromo);
			self.app.post('/create', routes.createPromo);
			self.createRoutes();
	        
        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new PromoApp();
zapp.initialize();
zapp.start();

