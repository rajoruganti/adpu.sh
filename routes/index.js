var async = require('async');
var mongo = require('mongodb');
var path = require('path');
var util = require('util');

var OAuth= require('oauth').OAuth;
var nodemailer = require("nodemailer");

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
        user: "raj@oruganti.org",
        pass: "godZil!a"
    }
});

var twCallbackUrl = process.env.TWITTER_CALLBACK_URL || "http://pro.mo:8080";

var oa = new OAuth(
	"https://api.twitter.com/oauth/request_token",
	"https://api.twitter.com/oauth/access_token",
	"gGwatU5a5uyGIk9DPK15tA",
	"WnkuSYwFUAvQ8QMxhaWgipXknhg6wnvcELfWsB4v1YY",
	"1.0",
	twCallbackUrl+"/auth/twitter/callback",
	"HMAC-SHA1"
);

var Server = mongo.Server,
	Db = mongo.Db,
	BSON = mongo.BSONPure;
	var dbUser = process.env.OPENSHIFT_MONGODB_DB_USERNAME;
	var dbPass = process.env.OPENSHIFT_MONGODB_DB_PASSWORD;	
	server = new Server(process.env.OPENSHIFT_MONGODB_DB_HOST||'localhost', process.env.OPENSHIFT_MONGODB_DB_PORT||27017, {auto_reconnect: true});
	
/*
Added mongodb-2.2 to application promo
MongoDB 2.2 database added.  Please make note of these credentials:
   Root User:     admin
   Root Password: lcRsVDrK7RNg
   Database Name: promo
Connection URL: mongodb://$OPENSHIFT_MONGODB_DB_HOST:$OPENSHIFT_MONGODB_DB_PORT/
*/
	db = new Db('promo', server);

	db.open(function(err, db) {
	    if(!err) {
	        console.log("Connected to 'promo' database");
			if(process.env.NODE_ENV != "development"){
				db.admin().authenticate('admin', 'lcRsVDrK7RNg', function(de , db){
				     if(de){
				         console.log("could not authenticate");
				     }else {
				    console.log('auth connected to database :: ' );
				     }
				     });
			}
			
	        db.collection('promo', {strict:true}, function(err, collection) {
	            if (err) {
	                console.log("The 'promo' collection doesn't exist. Creating it with sample data...");
	                //populateDB();
	            }
	        });
	    }
		else{
			console.log("error connecting to mongo - returning ");
			//res.send("No db");
		}
	});



function cmd_exec(cmd, args, options, cb_stdout, cb_end) {
	var spawn = require('child_process').spawn,
	child = spawn(cmd, args, options),
	me = this,
	/*
	me = this;
	me.exit = 0;  // Send a cb to set 1 when cmd exits
	child.stdout.on('data', function (data) { cb_stdout(me, data) });
	child.stdout.on('end', function () { cb_end(me) });
	*/
	result = '';
	child.stdout.on('data', function(data) {
		result += data.toString();
	});
	child.on('exit', function(code) {
		console.log("result:"+result);
		return cb_end(me,result);	
	});
}


function getClientAddress(req){ 
    with(req)
        return (headers['x-forwarded-for'] || '').split(',')[0] 
            || connection.remoteAddress;
}

exports.home = function(req,res){
	var tplPath = path.join(__dirname, '../public/tpl/');
    var template  = require('swig');
	template.init({
	  allowErrors: false,
	  autoescape: true,
	  cache: true,
	  encoding: 'utf8',
	  filters: {},
	  root: "public/tpl",
	  tags: {},
	  extensions: {},
	  tzOffset: 0
	});
	var user = "";
	if(req.user){
		//logged in
		console.log("logged in");
		user = req.user.username;
	}
	var authErr = req.flash('error');
	console.log("err:"+authErr);
	var tmpl = template.compileFile(tplPath+'index.html');
	renderedHTML= tmpl.render({
	   user:user,
		message: authErr
	});
	res.send(renderedHTML);
};

exports.register = function(req,res){
	req.setEncoding("utf8");
	var ip = getClientAddress(req);
	var token = req.params.id;
	var username;
	async.series([
		// fetch user corresponding to hash from mongo
		function(callback){
			console.log('Retrieving user: ' + token);

		    db.collection('users', function(err, collection) {
		        collection.findOne({'token':token}, function(err, item) {
				if(err){
					console.log("err");
					res.send("You're not supposed to be here");
				}
				console.log(item);
				username=item.username;
				//console.log(message)
				callback();
				});
			});
		}
	],function(err,result){
		var tplPath = path.join(__dirname, '../public/tpl/');
	    var template  = require('swig');
		template.init({
		  allowErrors: false,
		  autoescape: true,
		  cache: true,
		  encoding: 'utf8',
		  filters: {},
		  root: "public/tpl",
		  tags: {},
		  extensions: {},
		  tzOffset: 0
		});

		var tmpl = template.compileFile(tplPath+'register.html');

		//var authErr = req.flash('error');
		//console.log("err:"+authErr);
		renderedHTML= tmpl.render({
		    username:username
		});

		res.send(renderedHTML);
	});
	
};

exports.doRegister = function(req,res){
	req.setEncoding("utf8");
	var ip = getClientAddress(req);
	var username = req.body.username;
	var password = req.body.password;
	console.log("registering:"+username);
	//insert
	var now = new Date();
	var jsonDate = now.toJSON();
	var xset = [{
		"ip":ip,
		"username":username,
		//"timestamp":jsonDate,
		"password":password
	}];
	console.log(xset);
	db.collection('users', function(err, collection) {
		collection.update({"username":username}, {$set:{password:password}},{safe:true,upsert:true}, function(err, result) {
			if(err){
				console.log("error saving user to mongo");
				res.redirect("/");
			}
			else{
				res.redirect("/dashboard");
			}
		});
	});
	
};

exports.account =function(req,res){
	res.send('Hello ' + req.user.username);
    
};
  
exports.profile = function(req,res){
	var tplPath = path.join(__dirname, '../public/tpl/');
    var template  = require('swig');
	template.init({
	  allowErrors: false,
	  autoescape: true,
	  cache: true,
	  encoding: 'utf8',
	  filters: {},
	  root: "public/tpl",
	  tags: {},
	  extensions: {},
	  tzOffset: 0
	});
	var user = "";
	if(req.user){
		//logged in
		console.log("logged in");
		user = req.user.username;
	}
	var authErr = req.flash('error');
	console.log("err:"+authErr);
	var tmpl = template.compileFile(tplPath+'profile.html');
	renderedHTML= tmpl.render({
	   user:user,
		message: authErr
	});
	res.send(renderedHTML);
};
exports.dashboard = function(req,res){
	var tplPath = path.join(__dirname, '../public/tpl/');
    var template  = require('swig');
	template.init({
	  allowErrors: false,
	  autoescape: true,
	  cache: true,
	  encoding: 'utf8',
	  filters: {},
	  root: "public/tpl",
	  tags: {},
	  extensions: {},
	  tzOffset: 0
	});
	var user = "";
	if(req.user){
		//logged in
		console.log("logged in");
		user = req.user.username;
	}
	var tmpl = template.compileFile(tplPath+'dashboard.html');
	renderedHTML= tmpl.render({
		user:user,
		//infects:JSON.stringify(infects)
	});
	res.send(renderedHTML);
};
exports.campaigns = function(req,res){
	var user = "";
	if(req.user){
		//logged in
		console.log("logged in");
		user = req.user.username;
	}
	
	var userId,
		promos = [],
		infects=[];
	// get all campaigns by user
	async.series([
		// find the user
		function(callback){
			console.log('Retrieving user: ' + user);
			db.collection('users', function(err, collection) {
		        collection.findOne({'username':user}, function(err, item) {
				if(err){
					console.log("err");
					callback();
				}
				userId = item._id;
				//console.log(message)
				callback();

				});
			});
		},
		// find promos mamtching userId
		function(callback){
			db.collection('promo', function(err, collection) {
		        collection.find({'user':userId}).toArray(function(err, items) {
					if(err){
						console.log("couldn't get promos for user:"+userId);
						callback();
					}
		            //promos= JSON.stringify(items);
					items.forEach(function(item){
						promos.push(item);
					});
					//promos = items;
					console.log("got promos for user:"+promos);
		
					callback();
		        });
		    });
		},
		
	],function(err, result){
		//console.log("user:"+userId);
		//console.log("promos:"+promos);
		//console.log("infects:"+infects);
		res.send(JSON.stringify(promos));
	});
    
	
};

exports.getInfects = function(req,res){
	var user = "";
	if(req.user){
		//logged in
		console.log("logged in");
		user = req.user.username;
	}
	var id = req.params.id;
	var BSON = mongo.BSONPure;
	var promo = new BSON.ObjectID(id);
	var userId,
		promos = [],
		infects=[];
	// get all campaigns by user
	async.series([
		// find infects on promo
		function(callback){
				console.log("Getting infects for promo:"+promo);
				// fetch the infects
				db.collection('infects', function(err, collection) {
			        collection.find({'campaign':promo}).toArray(function(err, items) {
						if(err){
							console.log("couldn't get infects for promo:"+promo);
							callback();
						}
							console.log("items:"+items);
						items.forEach(function(item){
							infects.push(item); 
							console.log(item);
						});
			            //infects= JSON.stringify(items);
						
						callback();
			        });
			    });
	    	}
		
	],function(err, result){
		res.send(JSON.stringify(infects));
	});
};
exports.updateCampaign = function(req,res){
	var id = req.body.pk;
	var campaign = req.body.value;
	var fieldName = req.body.name;
	var BSON = mongo.BSONPure;
	var o_id = new BSON.ObjectID(id);
	console.log("updating campaign:"+id+" - name:"+campaign+" - field:"+fieldName);
	db.collection('promo', function(err, collection) {
    	collection.update({'_id':o_id}, {$set:{campaign:campaign}},{safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating doc: ' + err);
                res.send({xtext:'An error has occurred while updating campaign name to db'});
				//callback();
            } else {
                console.log('' + result + ' document(s) updated');
				console.log("updated promo:"+id)
				res.send({status:"ok"});
            }
        });	
	});
};
exports.login=function(req, res) {
	var tplPath = path.join(__dirname, '../public/tpl/');
    var template  = require('swig');
	template.init({
	  allowErrors: false,
	  autoescape: true,
	  cache: true,
	  encoding: 'utf8',
	  filters: {},
	  root: "public/tpl",
	  tags: {},
	  extensions: {},
	  tzOffset: 0
	});
	
	var tmpl = template.compileFile(tplPath+'login.html');
	var user = "";
	if(req.user){
		//logged in
		console.log("logged in");
		user = req.user.username;
	}
	var authErr = req.flash('error');
	console.log("err:"+authErr);
	renderedHTML= tmpl.render({
	    message: authErr,
		user:user,
	});

	res.send(renderedHTML);
    
  };
  
exports.logout=function(req, res) {
    req.logout();
    res.redirect('/');
  };


exports.fb= function(req, res){
	req.setEncoding("utf8");
	var ip = getClientAddress(req);
	// fetch content corresponding to hash from mongo
	var id = req.params.id;
	res.send({})
};

exports.tw = function(req, res){
	var ip = getClientAddress(req);
	oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
		if (error) {
			console.log(error);
			res.send("yeah no. didn't work.")
		}
		else {
			req.session.rip = ip;
			req.session.cid = req.params.id;
			req.session.oauth = {token: oauth_token};
			req.session.tweeter = {};
			req.session.oauth.token = oauth_token;
			console.log('oauth.token: ' + req.session.oauth.token);
			req.session.oauth.token_secret = oauth_token_secret;
			console.log('oauth.token_secret: ' + req.session.oauth.token_secret);
			res.redirect('https://twitter.com/oauth/authorize?oauth_token='+oauth_token)
	}
	});
};

exports.twCallback = function(req, res, next){
	req.setEncoding("utf8");
	var ip = getClientAddress(req);
	if (req.session.oauth) {
		req.session.oauth.verifier = req.query.oauth_verifier;
		var oauth = req.session.oauth;
		var tweeter = req.session.tweeter;
		var cid = req.session.cid;
		var message,
			reward,
			campaign
			;
		var infectId;
		async.series([
			// get access token from tw
			function(callback){
					oa.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier, 
					function(error, oauth_access_token, oauth_access_token_secret, results){
						if (error){
							console.log(error);
							res.send("yeah something broke.");
						} else {
							req.session.oauth.access_token = oauth_access_token;
							req.session.oauth.access_token_secret = oauth_access_token_secret;
							console.log(results, req.session.oauth);
							req.session.tweeter.user_id = results.user_id;
							req.session.tweeter.screen_name = results.screen_name;
							// store the twitter handle for saving later
							callback();
						}
			
					});
			},
			//fetch the message from mongo
			function(callback){
					// fetch content corresponding to hash from mongo
					//var id = req.params.id;
					console.log('Retrieving promo: ' + cid);

				    db.collection('promo', function(err, collection) {
				        collection.findOne({'plink':cid}, function(err, item) {
						if(err){
							console.log("err");
						}
						campaign = item._id;
						message = item.message;
						reward = item.reward;
						//console.log(message)
						callback();

						});
					});
			},
			//tweet the message
			function(callback){
				var Twit = require('twit');

				var twitter = new Twit({
				    consumer_key:'gGwatU5a5uyGIk9DPK15tA',
				    consumer_secret:'WnkuSYwFUAvQ8QMxhaWgipXknhg6wnvcELfWsB4v1YY',
				    access_token:req.session.oauth.access_token,
				    access_token_secret: req.session.oauth.access_token_secret
				});
				//
				//  tweet 
				//
				console.log("sending message:"+message)
				twitter.post('statuses/update', { status: message}, function(err, reply) {
					if(err){
						console.error(err);
						res.send("failed");
					}
					else{
						// get the tweet id - used for tracking its presence later
						req.session.tweeter.tweet = reply;
						console.log(util.inspect(reply, false, null, true));
	//					console.log("success posting to twitter:"+reply);
						callback();
					}
				});
			},
			// save the tweet
			function(callback){
				// ip - from session
				// campaign_id from session
				// timestamp from current
				// location from ip
				// create json to insert into mongodb
				var now = new Date();
				var jsonDate = now.toJSON();
				var xset = [{
					"ip":req.session.rip,
					"campaign":campaign,
					"timestamp":jsonDate,
					"network":"tw",
					"handle":req.session.tweeter.screen_name,
					"user_id":req.session.tweeter.user_id
				}];
				console.log(xset);
				db.collection('infects', function(err, collection) {
					collection.insert(xset, {safe:true}, function(err, result) {
						if(err){
							console.log("error saving to mongo")
						}
						else{
							console.log("saved request to db:"+result[0]._id);
							infectId = result[0]._id;
							console.log("got infectId:"+infectId);
							callback();
							
						}
					});
				});
			},
			function(callback){
				// save the tweet response
				var xset = [{
					"infect":infectId,
					"tweet":req.session.tweeter.tweet
				}];
				db.collection('tweets', function(err, collection) {
					collection.insert(xset, {safe:true}, function(err, result) {
						if(err){
							console.log("error saving to mongo")
						}
						else{
							console.log("saved request to db:"+result[0]._id);
							tweetId = result[0]._id;
							console.log("got tweetId:"+tweetId);
							callback();
							
						}
					});
				});
			}
			// redirect the user
		],function(err,result){
				//console.log("result:"+result);
				res.redirect(reward);
			});
		
		
	} else
		next(new Error("you're not supposed to be here."))
};

exports.doPromo = function(req,res){
	
	
	req.setEncoding("utf8");
	var ip = getClientAddress(req);
	var referrer = req.headers.referer;
	req.session.referrer = referrer;
	// show content and random button
	// fetch content corresponding to hash from mongo
	var id = req.params.id;
	var sites = [];
    console.log('Retrieving promo: ' + id);
    db.collection('promo', function(err, collection) {
        collection.findOne({'plink':id}, function(err, item) {
		if(err){
			console.log(err);
			res.send("error fetching promo");
		}
			if (item.fb == true){
				sites.push("fb");
			}
			if (item.tw == true){
				sites.push("tw");
			}
			var site = sites[Math.floor(Math.random() * sites.length)];
			console.log(sites)
			var tplPath = path.join(__dirname, '../public/tpl/');
            var template  = require('swig');
			template.init({
			  allowErrors: false,
			  autoescape: true,
			  cache: true,
			  encoding: 'utf8',
			  filters: {},
			  root: "public/tpl",
			  tags: {},
			  extensions: {},
			  tzOffset: 0
			});
			
			var tmpl = template.compileFile(tplPath+'promo.html');
			renderedHTML= tmpl.render({
			    message: item.message,
				site: site,
				id:id,
				referrer:referrer
			});
			res.send(renderedHTML);
		});
    });
};

exports.createPromo = function(req,res){
		req.setEncoding("utf8");
		var ip = getClientAddress(req);
		console.log(req.body);
		var requestId, userId;
		var campaign,
			message,
			reward,
			sitenum=0,
			fb = false,
			tw = false,
			sites = [],
			hash,
			promoUrl,
			newUser=false,
			token
			;
		req.body.forEach(function(item, index) {
			// `item` is the next item in the array
			// `index` is the numeric position in the array, e.g. `array[index] == item`
			if (item.name=="message"){
				message = item.value;

			}
			else if (item.name=="reward"){
				reward = item.value;
				
			}
			else if (item.name == "email"){
				email = item.value;
			}
			else if (item.name=="campaign"){
				campaign = item.value;
			}
			else if (item.name=="sites"){
				console.log("index:"+index+"-"+item.value);
				sites[sitenum]=item.value;
			
				if (sites[sitenum] == "facebook"){
					fb = true;
				}
				if(sites[sitenum] == "twitter"){
					tw = true;
				}
				sitenum++;
			}
		});
		console.log(message);
		console.log(reward);
		console.log("fb:"+fb);
		console.log("tw:"+tw);
		console.log("campaign"+campaign);

		
		async.series([
			function(callback){
				//create a user record for future registration - if not already exists
				// find the user
				db.collection("users", function(err, collection) {
					collection.findOne({username: email}, {}, function(err, user) {
						if(err){callback();}
						if(user){
							userId = user._id;
							callback();
						}
						if (!user) {
							newUser = true; 
							// generate a token
							require('crypto').randomBytes(24, function(ex, buf) {
								token = buf.toString('hex');
								console.log("token:"+token);
								//insert
								var now = new Date();
								var jsonDate = now.toJSON();
								var xset = [{
									"ip":ip,
									"username":email,
									"timestamp":jsonDate,
									"token":token
								}];
								console.log(xset);
								db.collection('users', function(err, collection) {
									collection.insert(xset, {safe:true, upsert:true}, function(err, result) {
										if(err){
											console.log("error saving user to mongo")
										}
										else{
											console.log("saved request to db:"+result[0]._id);
											userId = result[0]._id;
											console.log("got userId:"+userId);
											callback();

										}
									});
								});
							});
						
						} 
						
					});
				});
			
			},
			//save the request to mongo
			function(callback){
				
				// create json to insert into mongodb
				var xset = [{
					"ip":ip,
					"message":message,
					"reward":reward,
					"fb":fb,
					"tw":tw,
					"user":userId,
					"campaign":campaign
				
				}];
				console.log(xset);
				db.collection('promo', function(err, collection) {
					collection.insert(xset, {safe:true}, function(err, result) {
						if(err){
							console.log("error saving to mongo")
						}
						else{
							console.log("saved request to db:"+result[0]._id);
							requestId = result[0]._id;
							console.log("got _id:"+requestId);
							callback();
							
						}
					});
				});
				
			},
			function(callback){
				// generate a unique code and update the doc in mongo
				hash = require('crypto').createHash('md5').update(message+reward).digest("hex");
				promoUrl = "http://"+req.headers.host+"/do/"+hash;
				console.log("hash:"+hash);
				db.collection('promo', function(err, collection) {
		        	collection.update({'_id':requestId}, {$set:{plink:hash}},{safe:true, upsert:true}, function(err, result) {
			            if (err) {
			                console.log('Error updating doc: ' + err);
			                res.send({xtext:'An error has occurred while updating plink to db'});
							callback();
			            } else {
			                console.log('' + result + ' document(s) updated');
							console.log("saved plink:"+requestId)
							callback();
			            }
			        });	
		    	});
			},
			//mail the user
			function(callback){
				mailBody = "<p>Your campaign has been created and your Promo link is:"+promoUrl+"<br/></p>";
				if (newUser=true){
					mailBody+="Go ahead and claim your account by clicking"+"<a href=\"http://pro.mo:8080/register/"+token+"\">here</a>";
				}
				// setup e-mail data with unicode symbols
				var mailOptions = {
				    from: "PRMOT ✔ <raj@oruganti.org>", // sender address
				    to: email, // list of receivers
				    subject: "Hello ✔", // Subject line
				    text: "PRMOT Campaign created ✔", // plaintext body
				    html: mailBody // html body
				}

				// send mail with defined transport object
				smtpTransport.sendMail(mailOptions, function(error, response){
				    if(error){
				        console.log(error);
				    }else{
				        console.log("Message sent: " + response.message);
				    }

				    // if you don't want to use this transport object anymore, uncomment following line
				    //smtpTransport.close(); // shut down the connection pool, no more messages
				});
				callback();
				
			}
		],function(err,result){
			//console.log("result:"+result);
			// construct the full url
			
			res.send({plink:promoUrl});
		});
	};
