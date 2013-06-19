var async = require('async');
var mongo = require('mongodb');
var path = require('path');

var OAuth= require('oauth').OAuth;

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
	db = new Db('xtraxt', server);

	db.open(function(err, db) {
	    if(!err) {
	        console.log("Connected to 'xtraxt' database");
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


exports.fb= function(req, res){
	req.setEncoding("utf8");
	var ip = getClientAddress(req);
	// fetch content corresponding to hash from mongo
	var id = req.params.id;
	res.send({})
};

exports.tw = function(req, res){
	oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
		if (error) {
			console.log(error);
			res.send("yeah no. didn't work.")
		}
		else {
			req.session.cid = req.params.id;
			req.session.oauth = {token: oauth_token};
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
		var cid = req.session.cid;
		var message,
			reward;
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
							console.log(results);
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
						console.log("success posting to twitter");
						callback();
					}
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
	// show content and random button
	// fetch content corresponding to hash from mongo
	var id = req.params.id;
	var sites = [];
    console.log('Retrieving promo: ' + id);
    db.collection('promo', function(err, collection) {
        collection.findOne({'plink':id}, function(err, item) {
		if(err){
			console.log("err");
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
			  root: "",
			  tags: {},
			  extensions: {},
			  tzOffset: 0
			});
			
			var tmpl = template.compileFile(tplPath+'promo.html');
			renderedHTML= tmpl.render({
			    message: item.message,
				site: site,
				id:id
			});
			res.send(renderedHTML);
		});
    });
};

exports.createPromo = function(req,res){
		req.setEncoding("utf8");
		var ip = getClientAddress(req);
		console.log(req.body);
		var requestId;
		var message,
			reward,
			sitenum=0,
			fb = false,
			tw = false,
			sites = [],
			hash;
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
		console.log("tw:"+tw)

		
		async.series([
			
			//save the request to mongo
			function(callback){
				
				// create json to insert into mongodb
				var xset = [{
					"ip":ip,
					"message":message,
					"reward":reward,
					"fb":fb,
					"tw":tw,
					"email":email,
				
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
				// generate a unique code
				
				hash = require('crypto').createHash('md5').update(message+reward).digest("hex");
				console.log("hash:"+hash);
				var xset = [
					{'_id':requestId},
					{ip:ip,
					message:message,
					reward:reward,
					fb:fb,
					tw:tw,
					email:email,
					plink:hash}
				
				];
				console.log(xset);
				
				db.collection('promo', function(err, collection) {
		        	collection.update({'_id':requestId}, 	{ip:ip,
						message:message,
						reward:reward,
						fb:fb,
						tw:tw,
						email:email,
						plink:hash},{safe:true}, function(err, result) {
			            if (err) {
			                console.log('Error updating doc: ' + err);
			                res.send({xtext:'An error has occurred while updating to db'});
							callback();
			            } else {
			                console.log('' + result + ' document(s) updated');
							console.log("saved:"+" into: "+requestId)
							callback();

			            }
			        });
					
		    	});
			}
		
		],function(err,result){
			//console.log("result:"+result);
			res.send({plink:"/do/"+hash});
		});
	};
