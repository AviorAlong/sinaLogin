const fs = require('fs');
const queryString = require('querystring');
const superagent = require('superagent');
const cheerio = require('cheerio');
const sinaSSOEncoder = require('../sinaLib/sina.js');
//url配置
const HOME_RUL = 'http://login.sina.com.cn/sso/login.php?client=ssologin.js(v1.4.19)&_=';
const preLoginUrl = 'http://login.sina.com.cn/sso/prelogin.php?';
const regMatchJson = /\{.*?\}/;
const userAgent = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'};
let userInfo = {
  name: 's2799021760@163.com',
  // pwd: '080719203x'
};
let parameters = {
  'entry': 'weibo',
  'callback': 'sinaSSOController.preloginCallBack',
  'su': 'czI3OTkwMjE3NjBAMTYzLmNvbQ==',
  'rsakt': 'mod',
  'checkpin': '1',
  'client': 'ssologin.js(v1.4.19)',
  '_': '1508392149085'
};
let postData = {
  'entry': 'weibo',
  'gateway': 1,
  'from': '',
  'savestate': 7,
  'useticket': 1,
  'pagerefer': 'http://www.sina.com.cn/',
  'vsnf': 1,
  'su': '',
  'service': 'miniblog',
  'servertime': '',
  'nonce': '',
  'pwencode': 'rsa2',
  'rsakv': '',
  'sp': '',
  'encoding': 'UTF-8',
  'cdult': 2,
  'url': 'http://weibo.com/ajaxlogin.php?framelogin=1&callback=parent.sinaSSOController.feedBackUrlCallBack',
  'prelt': '56',
  'pwencode': 'rsa2',
  'sr': '1920*1080',
  'qrcode_flag': false,
  'returntype': 'META'
}


//获取新浪微博预登陆结果
let getServerTime = function () {
  let url = preLoginUrl + queryString.stringify(parameters);
  return new Promise(function (resolve, reject) {
    superagent.get(url).set('Content-Type', 'application/x-javascript').buffer(true).end(function (err, res) {

      if (err) {
        console.log(err);
        return reject({
          status: -10,
          message: err | '预登陆请求出错'
        })
      }
      let preLoginCallBack = res.text.match(regMatchJson);

      return resolve(preLoginCallBack[0]);
    })
  })
}
//密码加密
let getPwd = function (pwd, servertime, nonce, pubkey) {
  let RSAKey = new sinaSSOEncoder.RSAKey();
  RSAKey.setPublic(pubkey, '10001');
  let password = RSAKey.encrypt([servertime, nonce].join("\t") + "\n" + pwd);
  return password;
}
//用户名加密
let getUser = function (name) {
  return toBase64String(name);
}
//获取登陆url
let getLoginUrl = function (options) {

  return new Promise(function (resolve, reject) {
    let preJson = JSON.parse(options);
    //预登陆返回的参数
    postData.servertime = preJson.servertime;
    postData.nonce = preJson.nonce;
    postData.rsakv = preJson.rsakv;

    postData.su = getUser(userInfo.name);
    postData.sp = getPwd(userInfo.pwd, preJson.servertime, preJson.nonce, preJson.pubkey);

    //登陆请求
    superagent.post(HOME_RUL + preJson.servertime).set({
      "Accept": '*/*'
    }).set({
      "Content-Type": "application/x-www-form-urlencoded"
    }).set(userAgent).send(postData).end(function (err, res) {

      if (err) {
        console.log('error:' + err)
        return reject({status: -12, message: '获取loginUrl出错'})
      }

      let html = res.text;

      let urlReg = /location\.replace\(\'(.*?)\'\)/;
      let httpReg = /'http(.*)'/
      let reUrl = html.match(urlReg)[0].match(httpReg)[0].replace(/'/g, '');
      //返回登陆url 和 cookie
      return resolve({url: reUrl, cookie: res.headers['set-cookie']});
    })
  })

}


/*
 * 获取cookie*/
let getCookie = function (options) {

  let url = options.url;
  let cookie = options.cookie;
  return new Promise(function (resolve, reject) {
    superagent.get(url).set({
      "Accept": '*/*'
    }).set({
      "Content-Type": "application/x-www-form-urlencoded",
      'Cookie': cookie
    }).set(userAgent).set({"Host": "passport.weibo.com", "Referer": "http://weibo.com/"}).end(function (err, res) {
      if (err) {
        return reject({status: -10, message: '获取cookie出错'});
      }
      let cookie = res.header;
      return resolve(cookie);
    })
  })
}
//转base64
function toBase64String(data) {
  let code = new Buffer(data);
  return code.toString('base64');
}

//登陆
function login() {
  getServerTime().then(function (result) {
    return getLoginUrl(result);
  }).then(function (url) {
    return getCookie(url);
  }).then(function (cookie) {
    return console.log(cookie)

  }).catch(function (error) {
    console.log(error.message | error)
  })
}
login();