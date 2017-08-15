/*Load Node.js Modules*/
var connect = require('connect');
var serveStatic = require('serve-static');
var http = require('http');
//var sessions = require('cookie-session')
var fs = require('fs');
var path  = require('path');
//var md5 = require('md5');
//var formidable = require('formidable');
var util  = require('util');
//var sanitizer = require('sanitizer');

var COBOJSL = {}; //add Common Bussines Oriented Javascrit Library 
//Init main Singleton Object
var JasilCM = connect();

JasilCM.MSGS = {};
JasilCM.MSGS.LoadPrivDefErr ="";
//eval(fs.readFileSync(path.resolve(__dirname, 'MsgDefs.js'))+'');
//eval(fs.readFileSync(path.resolve(__dirname, 'LogDefs.js'))+'');
eval(fs.readFileSync(path.resolve(__dirname, 'Config.js'))+'');


JasilCM.development  = process.argv[2] === 'yes';


console.log('Using development mode? ' + JasilCM.development);

/*JasilCM.db = new TransactionDatabase(
    new sqlite3.Database(JasilCM.dbName , sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
);

COBOJSL.db = JasilCM.db;*/

/**load external modules and extensions***/

//var inc_path = ['ext','mod','class','renderers','unittesting'];
var inc_path = ['mod'];

JasilCM.loadModsExt = function()
{
  for(var _inc=0; _inc != inc_path.length; _inc++)
  {
    var files = fs.readdirSync(path.resolve(__dirname, inc_path[_inc])+'');
    for(var _count=0; files.length !=_count; _count++)
    {
      console.log('loading ' + inc_path[_inc] +'  '+files[_count]);
      eval(fs.readFileSync(path.resolve(__dirname, inc_path[_inc],files[_count])) + '');
    }
  }
}

/** add middleware to connect */
JasilCM.use(serveStatic(__dirname + '/static'))
//JasilCM.use(sessions({name : JasilCM.cookieName , secret : JasilCM.cookieKey }));
JasilCM.use(function(req,res,next){
  //req.session.views=(req.session.views || 0)+1;
  if (req.session.hash == undefined)
  {
    req.session.hash = md5(Math.random() + ' ' + Math.random());
  }
  res.setHeader('Server' , 'Your mom 69.666');
  res.setHeader('Content-Type' , 'text/html ; charset=utf-8');
  req.IP = req.socket.remoteAddress;

  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
     if (err) 
     {
       res.writeHead(404);
       res.end(JasilCM.MSGS.WeirdPetition);
       console.log(req);
       return;
     }
     req.fields = fields; 
     req.files  = files; 
     console.log(fields);
     next();
  })
});


/*****end of middleware adding***************/

JasilCM.loadModsExt();
/*Start server and main loop*/
http.createServer(JasilCM).listen(7173,'localhost');

