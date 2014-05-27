var wsUri = "wss://s1.ripple.com/";
var websocket;
var wsCmdSubscribe;
var opStatus = document.getElementById("status");
var opWatch =  document.getElementById("watch");
var txAddr = document.getElementById("addresses");
var PRECISON_RATE = 6;
var DATE_RIPPLE_START = new Date(2000,0,1);
var JED = [
"rJYMACXJd1eejwzZA53VncYmiK2kZSBxyD",
"rnNqkPMMnrFdiq7uN1r4uAjq7Tvab4xgvL",
"rfXEyseNgExbQQv2Xk6Hzj11CrV4whutxu",
"rUPV9BZBL6vmFdkqiSB6c5ssmmLjpUBnbr",
"rHTxKLzRbniScyQFGMb3NodmxA848W8dKM",
"r3gLHvXwpaWQ3SBsBk1RyUSSXr1R5dgQFF",
"rEhKZcz5Ndjm9BzZmmKrtvhXPnSWByssDv",
"rKFX9siDtANNdGGtRai5YuP5CP8aD3EhJo",
"rER5shDpm6ghcZ2Zf7VzPHFoMnbUavWGb7",
"rnt3D5HCZxqkqnq5Xsm4wkkr1fWK48oHwT",
"rG1icQptiLK2ntLH4zT76kKfR1PzvMtFjd",
"rBt92zFDGzK2tCoTkxr81NojbKBXoec1wS"
];
URL_RIPPLEINFO = "http://rippleinfo.sinaapp.com/";

function init() {
	var addrs = "";
	JED.forEach(function (addr) {
		addrs += addr + "\n";
	});
	txAddr.value = addrs;
}
function watch() {	
	var addresses = txAddr.value;
	var accounts = [];
	addresses.split("\n").forEach(function (addr){
		if(addr.length>32) accounts.push(addr.trim());
	});
	console.log(accounts);
	wsCmdSubscribe = cmdSubscribe(1, "subscribe", accounts);
	opWatch.innerHTML = "";
	startWebSocket();
}

function startWebSocket() {
	writeToStatus("正在连接...");
	if(websocket) websocket.close();
	websocket = new WebSocket(wsUri);
	websocket.onopen = function(evt) { onOpen(evt) };
	websocket.onclose = function(evt) { onClose(evt) };
	websocket.onmessage = function(evt) { onMessage(evt) };
	websocket.onerror = function(evt) { onError(evt) };
}
function onOpen(evt) {
	writeToStatus("发送监控指令...");
	websocket.send(wsCmdSubscribe);
}
function onError(evt) {
	console.log(evt.data);
	writeToStatus("<span style='color:red;'>错误: </span> " + evt.data);
}
function onClose(evt) {
	writeToStatus("连接断开，正重新开始...");
	var date = formatDate(new Date);
	var txt_pause = date + " 连接中断，重新连接。";
	writeToWatch(txt_pause);
	startWebSocket();
}
function onMessage(evt) {
	var data = JSON.parse(evt.data);
	switch(data.id) {
		case 1: procWatch(data); break;
		default: procSubscribe(data);
	}
}

function procWatch(data) {
	console.log(data);
	writeToStatus("监控开始！");
}
function procSubscribe(data) {
	console.log(data);
	var tx = data.transaction;
	var date = calcDate(tx.date);
	var account = tx.Account;
	var type = tx.TransactionType;
	var txt_notify;
	switch(type) {
		case "TrustSet":
			var currency = tx.LimitAmount.currency;
			var issuer = 
			txt_notify = tx.LimitAmount.value + " " + 
				tx.LimitAmount.currency + " to " + tx.LimitAmount.issuer;
			break;
		case "Payment":
			var amount =  toAmount(tx.Amount)
			txt_notify = amount.value + " " + amount.currency +
				" from " + account + " to " + tx.Destination;
			break;
		case "OfferCreate":
			var get = toAmount(tx.TakerGets);
			var pay = toAmount(tx.TakerPays);
			txt_notify = get.value + " " + get.currency + " for " +
				pay.value + " " + pay.currency + " @" + rate(get.value/pay.value);
			break;
		case "OfferCancel":
			var nodes = data.meta.AffectedNodes;
			nodes.forEach(function (n) {
				if(n.DeletedNode && n.DeletedNode.LedgerEntryType === "Offer") {
					var ff = n.DeletedNode.FinalFields;
					if(ff.Account === account) {
						var get = toAmount(ff.TakerGets);
						var pay = toAmount(ff.TakerPays);
						txt_notify = get.value + " " + get.currency + " for " +
							pay.value + " " + pay.currency + " @" + rate(get.value/pay.value);
					}
				}
			});
			break;
	}
	var txt_watch = date + " " + markJed(account) + " - " + type + ": " + txt_notify;
	var txt_alert = account + "\n" + type + ": " + txt_notify;
	writeToWatch(txt_watch);
	alert(txt_alert);
}

function cmdSubscribe(id, cmd, accounts) {
	return JSON.stringify({
	    id: id, command: cmd, accounts: accounts});}

function calcDate(date) {
	var d = new Date(DATE_RIPPLE_START.getTime() - DATE_RIPPLE_START.getTimezoneOffset() * 60 * 1000 + date * 1000);
	return formatDate(d);}
function formatDate(d) {
	var year = d.getFullYear();
	var month = d.getMonth() + 1;
	var day = d.getDate();
	var hour = d.getHours();
	var min = d.getMinutes();
	var sec = d.getSeconds();
	return year + "/" + (month < 10 ? "0" + month : month) + "/"
        + (day < 10 ? "0" + day : day) + " "
     		+ (hour < 10 ? "0" + hour : hour) + ":"
        + (min < 10 ? "0" + min : min) + ":"
      	+ (sec < 10 ? "0" + sec : sec);}
function xrp(balance) {
	return balance / 1000000;}
function toAmount(amount) {
	var amt = {value: 0, currency: '', issuer: ''};
	if(amount.currency) {
		amt.value = amount.value;
		amt.currency = amount.currency;
		amt.issuer = amount.issuer;
	} else {
		amt.value = xrp(amount);
		amt.currency = 'XRP';
		amt.issuer = '';
	}
	return amt;
}
function rate(num){
    var s = num.toString().split('.');
    if(s.length===1) return	num;
    var i = s[0];
    if(i.length>2) return i;
    var d = s[1].substring(0,PRECISON_RATE);
    if(i==="0") return i + "." + (d==="000000" ? "" : d);
  	return i + "." + d.substring(0,3-i.length);}
function fix(str,precision){
    return parseFloat(str).toFixed(precision).toString();}
function comma(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");}

function writeToStatus(message) {
	opStatus.innerHTML = message;}
function writeToWatch(data) {
	var row = document.createElement("tr");
	row.innerHTML = "<td>" + data + "</td>";
	opWatch.appendChild(row);}

function markJed(account) {
	return "<span class='" + (JED.indexOf(account)>=0 ? "red" : "") + "'>" + account + "</span>"
}

window.addEventListener("load", init, false);