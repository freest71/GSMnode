var express = require('express');
var router = express.Router();

/* shb0976@01 */
var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'test1234',
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
	console.log("___fire_token=[%s]", req.body.fire_token);

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
					[req.body.jkw_no, tokens[2], req.body.fire_token],
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
	console.log("___device_token=[%s]", req.params.device_token);

	connection.query('select * from tbl_gsm_login where device_token=?',
		[req.params.device_token], function(err, results, fields) {
			if (err) {
				res.send(JSON.stringify(err));
			} else {
				if (results.length > 0) {
					console.log("___result true___");
					console.log(JSON.stringify(results[0]));
					res.send(JSON.stringify({result:true,results:results[0]}));
				} else {
					console.log("___result false___");
					res.send(JSON.stringify({result:false}));
				}				
			}
		});
});


router.put('/gsm/status', function(req, res) {
	var branch_no = req.body.branch_no;
	var status1 = req.body.webserver_1_status;
	var status2 = req.body.webserver_2_status;

	console.log("___branch_no=", branch_no);
	console.log("___status1=", status1);
	console.log("___status2=", status2);

	connection.query(
		'update tbl_gsm_mas \
		 	set webserver_1_status = ?, \
		 	    webserver_2_status = ?  \
		 where branch_no = ?',
		[ status1, status2, Number(branch_no)], 
		function(err, result) {
			if (err) {
				console.log("___웹서버 모니터링 결과 update error");
				res.send(JSON.stringify(err));
			} else {
				console.log("___웹서버 모니터링 결과 update success");
				res.send(JSON.stringify({
					result:true,
					db_result:result
				}));
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
		'select a.branch_no, a.branch_name, a.webserver_location, b.webserver_1_status, b.webserver_2_status \
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
AAAAxVrgQyI:APA91bF0HyhA150C7jPS8W6BJ5bC5NtcpLbymDycd6s_6bffZnjZy3lCIddiO9YwTeOBjywm6YSMZvfUOyZM7gDFenILR0pJAOVrCM0OMaX33E4ksQNkE3M2aCSV5wGDPo-43E5A00Ww
이전 서버 키 :
AIzaSyCWldFwpkZWonM1hY-1Qh7gEWUFhz3Ay_c
웹 API 키:
AIzaSyDkm_jnfLNiNI639sTA523f9tHOCnGQ6BA
*/
var FCM = require('fcm-node');
var serverKey = 'AAAAxVrgQyI:APA91bF0HyhA150C7jPS8W6BJ5bC5NtcpLbymDycd6s_6bffZnjZy3lCIddiO9YwTeOBjywm6YSMZvfUOyZM7gDFenILR0pJAOVrCM0OMaX33E4ksQNkE3M2aCSV5wGDPo-43E5A00Ww'; //put your server key here
var fcm = new FCM(serverKey);

router.post('/user/push/',function(req,res) {
	console.log("__/user/push__device_token=");
	console.log(req.body.device_token);

	var device_token = req.body.device_token;

	connection.query(
		'select device_token from tbl_gsm_login where device_token = ?',
		[ req.body.device_token ], 
		function(err, results, fields) {
			if (err) {
				res.send(JSON.stringify({result:false,err:err}));
			} else {
				if (results.length > 0) {
					var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
				        to: results[0].device_token, 
				        collapse_key: 'shinhan_collapse_key',
				        notification: {
				            title: '서버 모니터링 오류알림 PUSH TEST', 
				            body: '베트남 웹서버1 장애 상태입니다.' 
				        },				        
				        data: {  //you can send only notification or only data(or include both)
				            data1: '테스트value1',
				            data2: '테스트value2'
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
});

///////////////////////////////////////////////////////////////////

module.exports = router;
