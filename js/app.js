var accountTimer = null;
var tickerTimer = null;
var alarmsCollection = [];

var storage = window.localStorage;

var app = {
	db: {
		connection: null,
		init: function(cb){
			app.db.connection.transaction(
				function(tx){
					console.log("Beginning database init");
					tx.executeSql("CREATE TABLE IF NOT EXISTS configuration (name, value)");
					tx.executeSql("CREATE TABLE IF NOT EXISTS alarms (name, ticker, condition, status, beep, notification)");
				},
				function(tx, err){
					alert("Error initing database: " + err);
				},
				function(){
					console.log("Database init successful");
					if(cb != null){
						cb();
					} // if
				}
			)
		}
	},
	key: "",
	secret: "",
	isNotificationsEnabled: false,
	init: function(){
		document.addEventListener("deviceready", this.onDeviceReady, false);
		document.addEventListener("pause", this.onDevicePause, false);
		document.addEventListener("resume", this.onDeviceResume, false);
		document.addEventListener("online", this.onDeviceOnline, false);
		document.addEventListener("offline", this.onDeviceOffline, false);
	},
	onDeviceReady: function(){
	
		firstRun();				

		var now = new Date();
		now.setSeconds(now.getSeconds() + 1800);
		
		// this is just a demo of the functionality
		if(device.platform == "Android"){
			plugins.localNotification.add({
				date: now,
				message: 'The price has changed.',
				ticker: 'PRICE ALERT',
				repeatDaily: false,
				id: 4
			});
		} // if
		
		app.db.connection = window.openDatabase("btc-e-mobile-trader", "1.0", "Btc-E Mobile Trader", 200000);
		
		app.db.init(function(){
			app.db.connection.transaction(
				function(tx){
					tx.executeSql("SELECT name, value FROM configuration", [],
						function(tx, results){
						
							for(var i = 0; i < results.rows.length; i++){
								var rowItem = results.rows.item(i);
								switch(rowItem.name){
									case "key":
										app.key = rowItem.value;
										break;
									case "secret":
										app.secret = rowItem.value;
										break;
									case "notifications":
										app.isNotificationsEnabled = ((parseInt(rowItem.value) > 0) ? true : false)
										break;
								} // switch
							} // for							 
						},
						function(error){
							console.log(error.code);
						}
					);
					tx.executeSql("SELECT * FROM alarms", [],
						function(tx, results){					
							
							for(var i = 0; i < results.rows.length; i++){
								var rowItem = results.rows.item(i);
							
								alarmsCollection[alarmsCollection.length] = {
									name: rowItem.name
								};
							} // for				
						},
						function(error){
							console.log(error.code);
						}
					);
				},
				function(tx, error){
				
				},
				function(){
					
				}
			)
		});
	},
	onDevicePause: function(){
		stopOnlineTasks()
	},
	onDeviceResume: function(){
		tickerTimerTick();
	},
	onDeviceOnline: function(){
		tickerTimerTick();
	},
	onDeviceOffline: function(){
		stopOnlineTasks();
	}
}

var Alarm = function(){
	this.name = "";
	this.ticker = "";
	this.condition = 0.00;
	this.status = "above";
	this.isBeep = false;
	this.isNotification = false;
	this.save = function(success, error){
	
		var ctx = this;
	
		app.db.connection.transaction(
			function(tx){
				tx.executeSql("INSERT INTO alarms (name, ticker, condition, status, beep, notification) VALUES (?,?,?,?,?,?)", 
					[ctx.name, ctx.ticker, ctx.condition, ctx.status, ctx.isBeep ? 1 : 0, ctx.isNotification ? 1 : 0]);				
			},
			function(tx, err){
				error(err);
			},
			function(){
				alarmsCollection[alarmsCollection.length] = {
					name: ctx.name
				};
				renderAlarms();
				success();
			}
		);
	};
	this.getByName = function(name, callback, error){
		app.db.connection.transaction(
			function(tx){
				tx.executeSql("SELECT * FROM alarms WHERE name = ?", [name],
					function(tx, results){
						if(results.rows.length > 0){
							var item = results.rows.item(0);
							
							alarm = new Alarm();
							alarm.name = item.name;
							alarm.ticker = item.ticker;
							alarm.condition = item.condition;
							alarm.status = item.status;
							alarm.isBeep = item.beep > 0 ? true : false;
							alarm.isNotification = item.notification > 0 ? true : false;
							
							callback(alarm);
						} // if
						callback(null);
					},
					function(err){
						console.log(err);
						error(err);
					}
				);
			},
			function(tx, err){
			
			},
			function(){
			
			}
		);
	}
};

var btceApi = {
	getBtcUsd: function (callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/btc_usd/ticker?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
				callback(res.ticker);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	getLtcBtc: function(callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/ltc_btc/ticker?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
				callback(res.ticker);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	getLtcUsd: function(callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/ltc_usd/ticker?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
				callback(res.ticker);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	getNvcBtc: function(callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/nvc_btc/ticker?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
				callback(res.ticker);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	getTrcBtc: function(callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/trc_btc/ticker?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
				callback(res.ticker);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	getPpcBtc: function(callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/ppc_btc/ticker?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
				callback(res.ticker);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	getLtcUsdBuyOrders: function(callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/ltc_usd/trades?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
				
				var buyOrders = [];
				
				for(var i = 0; i < res.length; i++){
					var obj = res[i];
					
					if(obj.trade_type == "bid"){
						buyOrders[buyOrders.length] = obj;
					} // else if
				} // for
				
				callback(buyOrders);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	getLtcUsdSellOrders: function(callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/ltc_usd/trades?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
	
				var sellOrders = [];
				
				for(var i = 0; i < res.length; i++){
					var obj = res[i];
					
					if(obj.trade_type == "ask"){
						sellOrders[sellOrders.length] = obj;
					} // else if
				} // for
				
				callback(sellOrders);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	getLtcBtcBuyOrders: function(callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/ltc_btc/trades?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
	
				var sellOrders = [];
				
				for(var i = 0; i < res.length; i++){
					var obj = res[i];
					
					if(obj.trade_type == "ask"){
						sellOrders[sellOrders.length] = obj;
					} // else if
				} // for
				
				callback(sellOrders);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	getLtcBtcSellOrders: function(callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/ltc_btc/trades?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
	
				var sellOrders = [];
				
				for(var i = 0; i < res.length; i++){
					var obj = res[i];
					
					if(obj.trade_type == "ask"){
						sellOrders[sellOrders.length] = obj;
					} // else if
				} // for
				
				callback(sellOrders);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	getBtcUsdBuyOrders: function(callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/btc_usd/trades?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
	
				var sellOrders = [];
				
				for(var i = 0; i < res.length; i++){
					var obj = res[i];
					
					if(obj.trade_type == "ask"){
						sellOrders[sellOrders.length] = obj;
					} // else if
				} // for
				
				callback(sellOrders);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	getBtcUsdSellOrders: function(callback){
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Cache-Control", "no-cache");
				req.setRequestHeader("pragma", "no-cache");
			},
			url: 'https://btc-e.com/api/2/btc_usd/trades?time=' + new Date().getMilliseconds(),
			dataType: 'json',
			success: function(res){
	
				var sellOrders = [];
				
				for(var i = 0; i < res.length; i++){
					var obj = res[i];
					
					if(obj.trade_type == "ask"){
						sellOrders[sellOrders.length] = obj;
					} // else if
				} // for
				
				callback(sellOrders);
			},
			error: function(error, msg){
				console.log(msg);
			}
		});
	},
	btceApiCall: function(method, key, secret, callback){
	
		var data = "method="+method+"&nonce=" + Math.round(new Date().getTime()/1000.0);

		var sign = CryptoJS.HmacSHA512(data, secret);
					
		$.ajax({
			beforeSend: function(req){
				req.setRequestHeader("Sign", sign);
				req.setRequestHeader("Key", key);
			},
			url: 'https://btc-e.com/tapi/',
			data: data,
			type: 'post',
			dataType: 'json',
			success: function(res){
				callback(res.return);
			},
			error: function(err, msg){
				alert('Error: ' + msg);
			}
		});
	},
	createBuyOrder: function(){
	
	},			
	createSellOrder: function(){
			
	}
}

app.init();
			
function stopOnlineTasks(){
	if(accountTimer != null){
		clearInterval(accountTimer);
	} // if
	if(tickerTimer != null){
		clearInterval(tickerTimer);
	} // if
}
			
function tickerTimerTick(){
	if(tickerTimer != null){
		clearInterval(tickerTimer);
	} // if
	getTickerData();
	tickerTimer = setInterval(tickerTimerTick, 1000 * 10);
}
			
function firstRun(){
				
	tickerTimerTick();				
	loadAccountInfo();
}
			
function loadAccountInfo(){
			
	var key = storage.getItem("btce-key");
	var secret = storage.getItem("btce-secret");
			
	if((key == null || key == "") && (secret == null || secret == "")){
		window.location = "#settings";
	} // if
	else{
		startAccountTimer();
	} // else
}
			
function startAccountTimer(){
	accountTimer = setInterval(function(){
		getAccountInfo();
	}, 1000 * 15);
}
			
var storage = window.localStorage;

// Place init code that must be fired on every page here.			
$(document).on("pageinit", function(){
	$("#btc-e-link-btn").on("tap", function(){
		var ref = window.open("https://btc-e.com", "_system", "location=yes");
	});
});

$("#settings").on("pageinit", function(){
	console.log("Settings PageInit Firing");
	$("#key").val(storage.getItem("btce-key"));
	$("#secret").val(storage.getItem("btce-secret"));
					
	$("#btn-save-credentials").bind("tap", function(){
	
		app.database.connection.transaction(
			function(tx){
				tx.executeSql("INSERT INTO configuration (name, value) VALUES (?,?)", ["btcekey", $("#key").val()]);
				tx.executeSql("INSERT INTO configuration (name, value) VALUES (?,?)", ["btcesecret", $("#secret").val()]);
			},
			function(tx, error){
				console.log(error);
			},
			function(){				
				loadAccountInfo();
				$.mobile.changePage($("#index"), "flip");
			}
		);								
	});
});

// Buy Page Initialization
$("#buy").on("pageinit", function(){
	$("#buy-btn").on("tap", function(){	
		
		if(device.platform == "Android"){
			navigator.notification.confirm("Please Confirm Buy Order", function (btnNum){
				if(btnNum == "1"){
					// peform trade here.
					navigator.notification.alert("Trade Complete!");
				} // if
				$.mobile.changePage($("#trade"), "slide", true);
			},
			"Buy Confirmation", "Confirm, Cancel");
		} // if		
	});
});

$("#alarms").on("pageinit", function(){
	renderAlarms();
});

function renderAlarms(){
	var alarmsList = $("#alarms-list");
	alarmsList.empty();
							
	for(var i = 0; i < alarmsCollection.length; i++){
		var rowItem = alarmsCollection[i];
						
		var li = $('<li></li>');
		var anchor = $('<a href="#" data-alarm-name="' + rowItem.name + '">' + rowItem.name + '</a>');
		anchor.on('tap', function(){
			var alarmName = $(this).attr('data-alarm-name');
			navigator.notification.alert(alarmName);
		});		
		li.append(anchor);
		alarmsList.append(li);
	} // for
					
	alarmsList.listview("refresh");
}

$("#buy").on("pagecreate", function(){
	console.log("Firing Buy PageCreate");
	
});

$("#add-alarm").on("pageinit", function(){
	$("#alarm-save-btn").on("tap", function(){
		var alarm = new Alarm();
		alarm.name = $("#alarm-name").val();
		alarm.ticker = $("#alarm-when").val();
		alarm.condition = $("#alarm-value").val();
		alarm.status = $("#alarm-is").val();
		alarm.beep = $("#alarm-beep").attr("checked") == "checked" ? true : false;
		alarm.isNotification = $("#alarm-notification").attr("checked") == "checked" ? true : false;
		alarm.save(
			function(){
				$.mobile.changePage($("#alarms"), "slide", true);
			},
			function(error){
				navigator.notification.alert("Error creating Alarm. Code: " +  error.code);
				console.log(error.code);
			}
		);
	});
});

$("#trade").on("pageinit", function(){

	$("#load-orders-btn").on("tap", function(){
		
		plugins.waitingDialog.show("Loading Orders");
		
		var currency = $("#currency").val();
		var tradeType = $("#trade-type").val();
		var orders = $("#orders");
		
		orders.empty();
		
		switch(currency){
			case "ltcusd":
				if(tradeType == "buyorders"){
					btceApi.getLtcUsdBuyOrders(function(buyOrders){
						for(var i = 0; i < buyOrders.length; i++){
							orders.append($('<li>Amount: ' + parseFloat(buyOrders[i].amount).toFixed(5) + '<br/>Price: ' + parseFloat(buyOrders[i].price).toFixed(5) + '<br/>Total: ' + parseFloat(buyOrders[i].price * buyOrders[i].amount).toFixed(5) + '</li>'));
						}
						orders.listview("refresh");
						plugins.waitingDialog.hide();
					});
				} // if
				else{
					btceApi.getLtcUsdSellOrders(function(sellOrders){
						for(var i = 0; i < sellOrders.length; i++){
							orders.append($('<li>Amount: ' + parseFloat(sellOrders[i].amount).toFixed(5) + '<br/>Price: ' + parseFloat(sellOrders[i].price).toFixed(5) + '<br/>Total: ' + parseFloat(sellOrders[i].price * sellOrders[i].amount).toFixed(5) + '</li>'));
						}
						orders.listview("refresh");
						plugins.waitingDialog.hide();
					});
				} // else
				break;
			case "ltcbtc":
				if(tradeType == "buyorders"){
					btceApi.getLtcBctBuyOrders(function(buyOrders){
						for(var i = 0; i < buyOrders.length; i++){
							orders.append($('<li>Amount: ' + parseFloat(buyOrders[i].amount).toFixed(5) + '<br/>Price: ' + parseFloat(buyOrders[i].price).toFixed(5) + '<br/>Total: ' + parseFloat(buyOrders[i].price * buyOrders[i].amount).toFixed(5) + '</li>'));
						}
						orders.listview("refresh");
						plugins.waitingDialog.hide();
					});
				} // if
				else{
					btceApi.getLtcBctSellOrders(function(sellOrders){
						for(var i = 0; i < sellOrders.length; i++){
							orders.append($('<li>Amount: ' + parseFloat(sellOrders[i].amount).toFixed(5) + '<br/>Price: ' + parseFloat(sellOrders[i].price).toFixed(5) + '<br/>Total: ' + parseFloat(sellOrders[i].price * sellOrders[i].amount).toFixed(5) + '</li>'));
						}
						orders.listview("refresh");
						plugins.waitingDialog.hide();
					});
				} // else
				break;
			case "btcusd":
				if(tradeType == "buyorders"){
					btceApi.getBtcUsdBuyOrders(function(buyOrders){
						for(var i = 0; i < buyOrders.length; i++){
							orders.append($('<li>Amount: ' + parseFloat(buyOrders[i].amount).toFixed(5) + '<br/>Price: ' + parseFloat(buyOrders[i].price).toFixed(5) + '<br/>Total: ' + parseFloat(buyOrders[i].price * buyOrders[i].amount).toFixed(5) + '</li>'));
						}
						orders.listview("refresh");
						plugins.waitingDialog.hide();
					});
				} // if
				else{
					btceApi.getBtcUsdSellOrders(function(sellOrders){
						for(var i = 0; i < sellOrders.length; i++){
							orders.append($('<li>Amount: ' + parseFloat(sellOrders[i].amount).toFixed(5) + '<br/>Price: ' + parseFloat(sellOrders[i].price).toFixed(5) + '<br/>Total: ' + parseFloat(sellOrders[i].price * sellOrders[i].amount).toFixed(5) + '</li>'));
						}
						orders.listview("refresh");
						plugins.waitingDialog.hide();
					});
				} // else
				break;
		}
	});
});
			
function getAccountInfo(){		 
				
	btceApi.btceApiCall("getInfo", storage.getItem("btce-key"), storage.getItem("btce-secret"), function(info){				
		
		if(info != null){
			$("#usd-funds").html(parseFloat(info.funds.usd).toFixed(8));
			$("#btc-funds").html(parseFloat(info.funds.btc).toFixed(8));					
			$("#ltc-funds").html(parseFloat(info.funds.ltc).toFixed(8));					
			$("#nmc-funds").html(parseFloat(info.funds.nmc).toFixed(8));
			$("#nvc-funds").html(parseFloat(info.funds.nvc).toFixed(8));
			$("#trc-funds").html(parseFloat(info.funds.trc).toFixed(8));
			$("#ppc-funds").html(parseFloat(info.funds.ppc).toFixed(8));
		} // if
	});				
}
			
var btcUsdLast = 0;
var ltcUsdLast = 0;
var ltcBtcLast = 0;
var nvcBtcLast = 0;
var trcBtcLast = 0;
var ppcBtcLast = 0;
			
var ltcHasBeeped = false;
			
function getTickerData(){
		
	btceApi.getBtcUsd(function(ticker){
		
		if(ticker.last < btcUsdLast){
			$("#btc-usd-ticker").css("background-color", "red");
		} // if
		else if(ticker.last > btcUsdLast){
			$("#btc-usd-ticker").css("background-color", "green");
		} // else if
				
		btcUsdLast = ticker.last;
		$("#btc-usd-ticker").html(parseFloat(ticker.last).toFixed(5));
	});
	
	btceApi.getLtcUsd(function(ticker){
		
		$("#ltc-usd-ticker").html(parseFloat(ticker.last).toFixed(5));
					
		if((parseFloat(ticker.last) >= parseFloat(5.10)) && !ltcHasBeeped){
			ltcHasBeeped = true;
			console.log("Beeped at " + ticker.last);
			//navigator.notification.beep(2);
		} // if
		else{
			ltcHasBeeped = false;
		} // else
				
		if(ticker.last < ltcUsdLast){
			$("#ltc-usd-ticker").css("background-color", "red");
		} // if
		else if(ticker.last > ltcUsdLast){
			$("#ltc-usd-ticker").css("background-color", "green");
		} // else if
				
		ltcUsdLast = ticker.last;					
	});
	
	btceApi.getLtcBtc(function(ticker){
				
		if(ticker.last < ltcBtcLast){
			$("#ltc-btc-ticker").css("background-color", "red");
		} // if
		else if(ticker.last > btcUsdLast){
			$("#ltc-btc-ticker").css("background-color", "green");
		} // else if
				
		ltcBtcLast = ticker.last;
		$("#ltc-btc-ticker").html(parseFloat(ticker.last).toFixed(5));
	});
	
	btceApi.getNvcBtc(function(ticker){
		if(ticker.last < nvcBtcLast){
			$("#nvc-btc-ticker").css("background-color", "red");
		} // if
		else if(ticker.last > nvcBtcLast){
			$("#nvc-btc-ticker").css("background-color", "green");
		} // else
		
		nvcBtcLast = ticker.last;
		$("#nvc-btc-ticker").html(parseFloat(ticker.last).toFixed(5));
	});
	
	btceApi.getTrcBtc(function(ticker){
		if(ticker.last < trcBtcLast){
			$("#trc-btc-ticker").css("background-color", "red");
		} // if
		else if(ticker.last > trcBtcLast){
			$("#trc-btc-ticker").css("background-color", "green");
		} // else
		
		trcBtcLast = ticker.last;
		$("#trc-btc-ticker").html(parseFloat(ticker.last).toFixed(5));
	});
	
	btceApi.getPpcBtc(function(ticker){
		if(ticker.last < ppcBtcLast){
			$("#ppc-btc-ticker").css("background-color", "red");
		} // if
		else if(ticker.last > ppcBtcLast){
			$("#ppc-btc-ticker").css("background-color", "green");
		} // else
		
		ppcBtcLast = ticker.last;
		$("#ppc-btc-ticker").html(parseFloat(ticker.last).toFixed(5));
	});
}