var lifegraph = require('lifegraph');

var pid = '34567834567';

lifegraph.configure('entrance-tutorial', "481848201872129", "f2696ba2416ae6a4cc9cbde1dddd6a5b");

lifegraph.requestAccess(pid, function (err, json) {
  console.log(err, json);
})