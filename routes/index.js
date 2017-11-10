var express = require('express');
var router = express.Router();

var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'shb0976@01',
  database : 'gsm'
}); 
connection.connect();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'GMS' });
});

var jwt = require('json-web-token');
router.post('/login', function(req, res) {

	console.log("___post /login___");
	console.log("___jkw_no=[%s]", req.body.jkw_no);
	console.log("___password=[%s]", req.body.password);
	console.log("___device_token=[%s]", req.body.device_token);

	var crypto = require('crypto');

	var password = req.body.password;

	console.log("___login password=[%s]", password);

	var hash = crypto.createHash('sha256').update(password).digest('base64');
      
	//암호화 패스워드로 토큰 생성
	var cur_date = new Date();
	var settingAddHeaders = {
		payload: {
			"iss":"shinhan",
			"aud":"mobile",
			"iat":cur_date.getTime(),
			"typ":"/online/transactionstatus/v2",
			"request":{
				"myTransactionId":req.body.jkw_no,
				"merchantTransactionId":hash,
				"status":"SUCCESS"
			}
		},
		header:{
			kid:'abcdefghijklmnopqrstuvwxyz1234567890'
		}						
	};

	var device_token = cur_date.getTime();

	console.log("___settingAddHeaders=%j", settingAddHeaders);

	var secret = "SHINHANMOBILETOPSECRET!!!!!!!!";
	
	//고유한 토큰 생성
	jwt.encode(secret, settingAddHeaders, 
		function(err, token) {
			if (err) {
				res.send(JSON.stringify(err));
			} else {
				console.log("___login tokken..");

				var tokens = token.split(".");
				connection.query(
					'insert into tbl_gsm_login('+
					'jkw_no, password_token, device_token) values(?,?,?)',
					[req.body.jkw_no, tokens[2], device_token],
					function(err, result) {
						if (err) {
							console.log("___login insert error");
							res.send(JSON.stringify(err));
						} else {
							console.log("___login insert success");
							res.send(JSON.stringify({
								result:true,
								token:tokens[2],
								db_result:result
							}));
						}
					});
			}
		});
});

router.get('/login/device_token/:device_token',function(req,res){
	console.log("device_token=[%s]", req.params.device_token);
	connection.query('select * from tbl_gsm_login where device_token=?',
		[req.params.device_token], function(err, results, fields) {
			if (err) {
				res.send(JSON.stringify(err));
			} else {
				if (results.length > 0) {
					res.send(JSON.stringify(results[0]));
				} else {
					res.send(JSON.stringify({}));
				}				
			}
		});
});


router.put('/user', function(req, res) {
	var rowid = req.body.rowid;
	var id = req.body.id;
	var password = req.body.password;
	res.send(JSON.stringify({rowid:rowid,id:id,
		password:password}));
});
router.delete('/user', function(req, res) {
	var rowid = req.body.rowid;
	res.send(JSON.stringify({rowid:rowid}));
});
router.get('/user/list', function(req, res) {
	res.send(JSON.stringify([]));
});

router.get('/gsm/list', function(req, res) {
	var obj = { result:true, ny:[] }
	console.log("__monitoring start");

	connection.query(
		'select a.branch_name, a.webserver_location, b.webserver_1_status, b.webserver_2_status \
			from tbl_gsm_branch_info a \
			left outer join tbl_gsm_mas b \
			on a.branch_no = b.branch_no \
			order by a.branch_name',
		function(err,results,fields) {
			if (err) {
				console.log("__monitoring select err");
				res.send(JSON.stringify({result:false,err:err}));				
			} else {
				console.log("__monitoring select success");
				for (var i = 0; i < results.length; i++) {
					obj.ny.push(results[i]);
				}
				console.log("__obj=[%j]",obj);
				res.send(JSON.stringify(obj));
			}
		});
});

/*
서버키
AAAAR74VBVk:APA91bHof8sTERy8WcbsRV8CmzMs-rv_cAWC_vA_zR10QT65A5ECzrtPJOae743DMrBB2lN6pqoi2i8LRcOB265x7BqrvKmruCbmn450Rp5_iL-gaS-TyV9eqf-xu9mYRPesuaKKiUGr 
이전 서버 키 :
AIzaSyDaJ5e48oW6akCgf-ZnXKQgl7YkEe7sh68 
웹 API 키:
AIzaSyBqkCGNfnqGae1fV7mGWqC9_Rodvw7epxc 
*/
/*
var FCM = require('fcm-node');
var serverKey = 'AAAAR74VBVk:APA91bHof8sTERy8WcbsRV8CmzMs-rv_cAWC_vA_zR10QT65A5ECzrtPJOae743DMrBB2lN6pqoi2i8LRcOB265x7BqrvKmruCbmn450Rp5_iL-gaS-TyV9eqf-xu9mYRPesuaKKiUGr'; //put your server key here
var fcm = new FCM(serverKey);
router.post('/user/push/:id',function(req,res) {
	connection.query(
		'select device_token from user_nologin where id=?',
		[ req.params.id ], 
		function(err, results, fields) {
			if (err) {
				res.send(JSON.stringify({result:false,err:err}));
			} else {
				if (results.length > 0) {
					var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
				        to: results[0].device_token, 
				        collapse_key: 'shinhan_collapse_key',
				        notification: {
				            title: 'PUSH NOTI TEST', 
				            body: 'this is a body of your push notification' 
				        },				        
				        data: {  //you can send only notification or only data(or include both)
				            data1: 'value1',
				            data2: 'value2'
				        }
				    };
				    fcm.send(message, function(err, response){
				        if (err) {
				            res.send(JSON.stringify({result:false,err:err}));
				        } else {
				        	res.send(JSON.stringify({result:true,response:response}));
				        }
				    });
				} else {
					res.send(JSON.stringify({result:false,err:'do not exist device token'}));
				}
			}
		});	
}); */

///////////////////////////////////////////////////////////////////

module.exports = router;
