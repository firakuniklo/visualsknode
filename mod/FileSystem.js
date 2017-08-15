/**
 * This is an example of a generic controller with the 4 basic operations
 * */
JasilCM.modules.FileSystem=
{
  enabled   : true,
  
  route     : '/FileSystem',
  

  handler   : function(req,res,next)
  {
      var cmd    = req.fields.cmd;
      var fields = req.fields; 
      //var user   = JasilCM.user(req);
      //res.writeHead(400);
      console.log("file");
      if (cmd == "readDirectory")
      {
        console.log('here');
        var dirs = fs.readdirSync(path.resolve(__dirname, fields.dir ));
        res.end(JSON.stringify(dirs));
        return;

      }
      if (cmd == "readFile" )
      {
         res.end( fs.readFileSync(path.resolve(__dirname, fields.file ) )+'');
         return;
      }
      if (cmd == "writeFile")
      {
         fs.writeFileSync(path.resolve(__dirname, fields.file ),fields.data ); 
         res.end('ok');         
         return;
      }
      if (cmd == 'removeFile')
      {
         fs.unlinkSync(path.resolve(__dirname, fields.file )); 
         res.end('ok');
         return;
      }
      if (cmd == 'exists')
      {
         var e = fs.existsSync(path.resolve(__dirname, fields.file )); 
         res.end(e+'');
         return;
      }
      res.writeHead(405);
      res.end('');
  },
  fields :{
  }

};

if (JasilCM.modules.FileSystem.enabled)
{
 JasilCM.use(JasilCM.modules.FileSystem.route , JasilCM.modules.FileSystem.handler);
}
