VSK.FSAPI = "http";


if(VSK.FSAPI == "http")
{
  VSK.baseUrl = "/FileSytem"; 

  VSK.fileExists = function(file, callback)
  {
    $.post(VSK.baseUrl, { cmd : 'exists', file : VSK.getWorldPath()  + file },callback);
  }

  VSK.writeFile =  function(file, data, callback)
  {
    $.post(VSK.baseUrl , { cmd : 'writeFile','data': data,  file : VSK.getWorldPath()  + file },callback);
  }

  VSK.readFile = function(file,callback)
  {
    $.post(VSK.baseUrl , { cmd : 'readFile', file : VSK.getWorldPath()  + file },callback);
  }
  VSK.removeFile = function(callback)
  {
    $.post(VSK.baseUrl { cmd:'removeFile', file:VSK.getWorldPath() + VSK.worldName }, callback);
  }
 
}

if (VSK.FSAPI == "custom")
{
}
