var VSK = {};
VSK.Objs =[]; 
VSK.mode = "add";
VSK.mouseDown = false;
VSK.SelectedNode = null;
VSK.lastAng = 0;
VSK.worldName = null;
VSK.SelectedState = "";
VSK.lastParent = null;
VSK.selectedParent = null;
VSK.transitionInterval = null 
VSK.assetsVisible = false;
VSK.changes = false;
VSK.drawLinks = true;
VSK.drawNodes = true;
VSK.drawVisualStates = true 
VSK.rootDirectory = "static/workspace/";

VSK.redraw = function()
{
  SKNode.clearContext();
  var objs = VSK.Objs; 
  for(var i=0; i!= objs.length; i++)
  {
    if ( VSK.drawVisualStates)
    {
      VSK.Objs[i].drawVisualStates();
    }
    if (VSK.drawNodes){
      VSK.Objs[i].drawNode();
    }
    if (VSK.drawLinks)
    {
      VSK.Objs[i].drawLinks();
    }
  }
  if (SKNode.SelectedNode && VSK.drawNodes)
  {
    SKNode.SelectedNode.drawNode(true);
  }
}

VSK.getWorldPath = function()
{
  return "static/workspace/worlds/" + $("#world-directories").val() + '/';
}

VSK.fileExists = function(file, callback)
{
 $.post('/FileSystem', { cmd : 'exists', file : VSK.getWorldPath()  + file },callback);
}

VSK.writeFile =  function(file, data, callback)
{
 $.post('/FileSystem', { cmd : 'writeFile','data': data,  file : VSK.getWorldPath()  + file },callback);
}

VSK.readFile = function(file,callback)
{
 $.post('/FileSystem', { cmd : 'readFile', file : VSK.getWorldPath()  + file },callback);
}

VSK.stringifyWorld = function()
{
  var ret=[];
  for(var i=0; i!= VSK.Objs.length; i++)
  {
    ret.push( VSK.Objs[i].toJSON());
  }
  return JSON.stringify(ret);
}

VSK.loadWorld = function ()
{
  VSK.Objs = [];
  VSK.readFile(VSK.worldName, function(data){
    var json = JSON.parse(data);
    for(var i=0; i != json.length; i++)
    {
       VSK.Objs.push( SKNode.fromJSON(json[i])); 
       VSK.Objs[i].update();
       VSK.SelectedNode = SKNode.SelectedNode = VSK.selectedParent=VSK.Objs[i]; 
    }
  });
  setTimeout(function(){
    VSK.enumerateNodeStates();
    SKNode.clearContext();
    VSK.redraw();
  }
  ,200
  );
}

VSK.saveCurrentWorld = function ()
{
  if ( VSK.worldName == null )
  {
    var alias;
    alias = prompt('insert world name')
    if (!alias.length)
    {
      alert('Invalid world name');
      return;
    }
    VSK.fileExists(alias, function(exists){
      if (JSON.parse(exists) == true)
      {
        alert('world already exists');
        return; 
      }
      VSK.writeFile(alias, VSK.stringifyWorld(), function(data){
        if (data == 'ok')
        {
          VSK.changes = false;
        }
        else
        {
          alert(data);
        }
      });
    });
    VSK.readAssetDirectory();
  }
  else 
  {
    VSK.writeFile(VSK.worldName, VSK.stringifyWorld(), function(data){
      if (data == 'ok')
      {
        VSK.changes = false;
      }
      else
      {
        alert(data);
      }
    });
  }
 
}

VSK.enableVisualState = function ()
{
  if (VSK.SelectedNode && VSK.SelectedNode.visualStatesByOrder.length)
  {
    VSK.SelectedNode.enableVisualState
    (
     $("#visual-state").val(),
     $("#enable-visual-state")[0].checked,
     $("#propagate-visual-state")[0].checked
    );
    VSK.redraw();
  }
}

VSK.getLayerObject = function ()
{
  if (VSK.SelectedNode && VSK.SelectedNode.visualStatesByOrder.length)
  {
    var st = VSK.SelectedNode.visualStates[$("#visual-state").val()];
    if (st.layersByOrder.length)
    {
       return st.layers[$("#layers").val()]; 
    }
  }
  return null;
}
VSK.getVisualStateObject= function ()
{
  if (VSK.SelectedNode && VSK.SelectedNode.visualStatesByOrder.length)
  {
       return VSK.SelectedNode.visualStates[$("#visual-state").val()];
  }
  return null;
}



VSK.simulate = function ()
{
  
  if ( VSK.selectedParent.step() )
  {
    clearInterval(VSK.transitionInterval);
    VSK.redraw();
  }
  VSK.redraw();
}

VSK.arrayToOptions = function(ar){
  var ret = '';
  if (!ar)
  {
    return ret;
  }
  for(var i=0; i != ar.length; i ++) 
  {
    ret+='<option value="' +  ar[i] + '">'+ar[i]+'</option>';
  }
  return ret;
}

VSK.readDirectory = function (directory,callback){
  $.post('/FileSystem', { cmd : 'readDirectory',  dir: directory },callback);
}

VSK.readAssetDirectory = function (){
  VSK.readDirectory('static/workspace/assets/',function(data){
    var dirs = JSON.parse(data);
    $("#asset-dirs").html( VSK.arrayToOptions(dirs));
    VSK.readAssetSubDirectory();
  });
}
VSK.readWorldsDirectory = function()
{
  VSK.readDirectory('static/workspace/worlds/',function(data){
    var dirs = JSON.parse(data);
    $("#world-directories").html( VSK.arrayToOptions(dirs));
    VSK.readWorldsList();
  });
}

VSK.readWorldsList  = function()
{
  VSK.readDirectory('static/workspace/worlds/'+  $("#world-directories").val(),function(data){
    var dirs = JSON.parse(data);
    $("#world-list").html( VSK.arrayToOptions(dirs)).trigger('change');
  });
}

VSK.readAssetSubDirectory = function (){
   VSK.readDirectory('static/workspace/assets/'+ $("#asset-dirs").val(),function(data){
    var dirs = JSON.parse(data);
    $("#asset-subdirs").html( VSK.arrayToOptions(dirs));
     VSK.renderAssets();
  });
}

VSK.deleteWorld = function()
{
  if (VSK.worldName == null)
  {
    return;
  }
  if (!confirm('do you really want to remove this world?'))
  {
    return;
  }
  var args = { cmd:'removeFile', file:VSK.getWorldPath() + VSK.worldName };
  $.post('/FileSystem',args,function(data)
  {
    if (data != 'ok')
    {
      alert(data);
    }
    else
    {
      VSK.readWorldsDirectory();
    }
  });

}

VSK.renderAssets = function (){
  var dir    = $("#asset-dirs").val();
  var subdir = $("#asset-subdirs").val();
  var path = 'static/workspace/assets/' + dir + '/' + subdir; 
  VSK.readDirectory(path, function(data){
    var assets = JSON.parse(data);
    var render= ''; 
    for(var i=0; i != assets.length; i++)
    { 
       render +='<img src="workspace/assets/'+dir+'/'+subdir +'/'+assets[i]
              +'" class="asset">';
    }
    $("#asset-list").html(render);
    $(".asset").on('dblclick',VSK.addAssetAsLayer);
  });
}

VSK.addAssetAsLayer = function ()
{
  if (VSK.SelectedNode && VSK.SelectedNode.visualStatesByOrder.length)
  {
    st = VSK.SelectedNode.visualStates[$("#visual-state").val()];
    st.addLayer(this, false, 0 , 0 );
    VSK.enumerateLayersOfState();
    VSK.redraw();
  }
}



VSK.updateObjects = function()
{
  var objs = VSK.Objs;
  for(var i=0; i!= objs.length; i++)
  {
    VSK.Objs[i].update();
  }
}

VSK.loadState = function()
{
  VSK.selectedParent.loadNodeState ( $("#node-state-list").val());  
  VSK.redraw();
}

VSK.enumerateNodeStates = function ()
{
   var nstl = $("#node-state-list").off();
   nstl.html('');
   var p = VSK.selectedParent; 
   if (!p)
   {
     return;
   }
   var body = '';
   for(var st in p.nodeStates )
   {
      body += '<option value="'+ st + '">' + st + '</option>';    
   }
   nstl.html(body);
   nstl.on('change', VSK.loadState );
   $("#from-state").html(body);
   $("#to-state").html(body);
}

VSK.enumerateVisualStates = function ()
{
  if (!VSK.SelectedNode) 
  {
    return;
  }
  var vs = $("#visual-state");
  vs.html(VSK.arrayToOptions(VSK.SelectedNode.visualStatesByOrder));
  vs.trigger('change');
}
VSK.enumerateLayersOfState = function()
{
   if (!VSK.SelectedNode)
   {
     return;
   }
   var layers = VSK.SelectedNode.visualStates[$("#visual-state").val()];
   if (!layers)
   {
     return;
   }
   var l = $("#layers");
   l.html( VSK.arrayToOptions( layers.layersByOrder));
   l.trigger('change');
}


VSK.updateSelection = function(x,y)
{
  var sel;
  var objs = VSK.Objs;
 
  for(var i=0; i!= objs.length; i++)
  {
    if ( (sel = objs[i].find(x,y)) != undefined )
    {
      VSK.SelectedNode = sel;
      if (sel.parent == null )
      {
        if ( VSK.lastParent != VSK.selectedParent ) 
        {
          VSK.enumerateNodeStates();
        }
        VSK.lastParent = VSK.selectedParent;
        VSK.selectedParent = sel;
      }
      $("#fixedNorm")[0].checked= sel.fixedNorm ;
      $("#alias").val(sel.alias);
      VSK.enumerateVisualStates();
      return sel; 
    }
  }
  VSK.SelectedNode = null;
 
}

VSK.enableLayer = function(){
  (VSK.getLayerObject()).enable = $(this)[0].checked; 
   VSK.redraw();
}

VSK.expandLayer = function(){
    (VSK.getLayerObject()).autoExpand = $(this)[0].checked; 
    VSK.redraw();
}



$(function(){
  VSK.vp = SKNode.Viewport  = $("#viewport")[0].getContext('2d');
  $( "#viewport" ).mousemove(function( event ) {
     var x  = event.pageX  - $(this).offset().left;
     var y  = event.pageY- $(this).offset().top;
     if ( !VSK.mouseDown )
     {
       return;
     }


     var n = VSK.SelectedNode;

     if (n == null)
     { 
       return;
     }
     var dx = x - n.x;
     var dy = y - n.y;

     if ( VSK.mode == 'move')
     {
       n.move(dx,dy,$("#anchor")[0].checked); 
     }
     if ( VSK.mode == 'rotate')
     {
       var ang = SKNode.atan(dx,dy);
       n.rotate( -ang+ VSK.lastAng); 
       VSK.lastAng = ang;
     }

     VSK.redraw();

  });
  
  $("[name=nodeTool]").bind('click',function(){
    VSK.mode = $(this).attr('id') ;
  });
 
  
  $("#viewport").mousedown(function(event){
    var x  = event.pageX  - $(this).offset().left;
    var y  = event.pageY- $(this).offset().top;
    VSK.changes = true; 
    VSK.mouseDown= true;
    VSK.updateObjects();
    VSK.lastX = x;
    VSK.lastY = y;
    if (VSK.mode == 'add')
    {
      if (VSK.SelectedNode == null)
      {
        var l = VSK.Objs.push( new SKNode (x,y,null,'parent'));
        VSK.selectedParent=VSK.SelectedNode=SKNode.SelectedNode=VSK.Objs[l-1]; 
        
      }
      else
      {
        SKNode.SelectedNode.addChild(x,y,SKNode.SelectedNode);
      }
    }

    if (VSK.mode == 'move')
    {
       VSK.updateSelection(x,y); 
    }
   if (VSK.mode == 'rotate')
    {
       VSK.updateSelection(x,y); 
    }

    if (VSK.mode == 'remove')
    {
      var sel = VSK.updateSelection(x,y);
      if (sel != null)
      {
          if (sel.parent == null )
          {
            VSK.Objs.splice( VSK.Objs.indexOf(sel),1);
            VSK.SelectedNode = null
          } 
          else 
          {
            VSK.SelectedNode = sel.parent;
            SKNode.SelectedNode = sel.parent;
            sel.remove();  
          }
      }
    }

    VSK.redraw();
  })
  .mouseup(function()
  {
    VSK.mouseDown = false; 
    VSK.updateObjects();
  });

 /************End of mouse events *********************************/

  $("#alias").off().on('keyup',function(){
     if ( VSK.SelectedNode != null)
     {
       VSK.SelectedNode.alias = $("#alias").val();
     }
  });
  $("#fixedNorm").off().on('click',function(){
     VSK.SelectedNode.fixedNorm = $("#fixedNorm")[0].checked; 
  });
  $("#new-parent").bind('click',function(){
    SKNode.SelectedNode = VSK.SelectedNode = null;
  });
  $("#delete-node-state").bind('click',function(){
    if (VSK.selectedParent == null)
    {
      return;
    }
    if (!confirm('Do you really want to remove this node state?'))
    {
     return;
    }
    VSK.selectedParent.deleteNodeState($("#node-state-list").val());
    VSK.enumerateNodeStates(); 
  });
  $("#add-node-state").bind('click',function(){
    
    if (VSK.selectedParent == null)
    {
      alert("select a parent node first");
      return; 
    }
    var alias = prompt('introduce node state alias');
    if (!alias.length)
    {
      alert('invalid node state alias');
      return;
    }
    if ( !VSK.selectedParent.addNodeState(alias))
    {
      alert('node state already exists');
      return;
    }
    var nstl = $("#node-state-list").off();
    //nstl.html ( nstl.html() + '<option value="'+alias+'">'+alias+'</option>');
    VSK.enumerateNodeStates();
    //nstl.on('change',vsk.loadstate)
  });

  $("#simulate-transition").bind('click',function(){
    var speed = parseInt($("#simulate-speed").val()); 
    if (isNaN(speed) || speed < 1 )
    {
      alert('invalid speed value');
      return;
    }
    if (!VSK.selectedParent)
    {
      alert('there are not objects in the world');
      return;
    }
    var from = $("#from-state").val();
    var to   = $("#to-state").val();
    if ( from == null || to == null )
    {
      alert('there are no states on this object');
      return;
    }
    if ( from == to)
    {
      alert(' node states must be different ');
      return; 
    }
    if ( VSK.transitionInterval )
    {
      clearInterval(VSK.transitionInterval);
    }
    VSK.selectedParent.calculateTransition(from, to, speed);
    VSK.transitionInterval = setInterval(VSK.simulate, 1);
  });
  $("#stop-simulation").bind('click', function(){
    clearInterval (VSK.transitionInterval);
  });
  $("#asset-dirs").on('change',function(){
    VSK.readAssetDirectory();
  });
  $("#asset-subdirs").on('change',function(){
    VSK.readAssetSubDirectory();
  });
  $("#asset-refresh").bind('click',function(){
    VSK.readAssetDirectory();
  });
  
  $("#show-assets").bind('click',function(){
    if ( !VSK.assetsVisible  )
    {
      $("#asset-list").css('top','40px');
      $("#show-assets").html("hidde");
    }
    else
    {
      $("#asset-list").css('top','-90000px');
      $("#show-assets").html("show");
    }
    VSK.assetsVisible = !VSK.assetsVisible;
  });
  $("#visual-state").on('change',function(){
    $("#enable-visual-state").off();
    VSK.enumerateLayersOfState();
    var st  = VSK.SelectedNode.visualStates[$(this).val()];
    if (!st)
    {
      return;
    }
    $("#enable-visual-state")[0].checked = st.enable;
    $("#state-order").val(st.order);
    $("#enable-visual-state").on('click',VSK.enableVisualState);
  });
  $("#enable-visual-state").on('click',VSK.enableVisualState);
  $("#add-visual-state").on('click',function(){
     var st = prompt('insert state alias');
     if (!st.length)
     {
       alert('invalid alias');
       return;
     }
     if (!VSK.SelectedNode)
     {
       alert('select a node');
       return;
     }
     VSK.SelectedNode.addVisualState(st,$("#propagate-visual-state")[0].checked);
     VSK.enumerateVisualStates();
     VSK.redraw();
  });
  $("#del-visual-state").on('click',function(){
    if (!confirm('do you really want to delete this state?'))
    {
      return;
    }
    VSK.SelectedNode.delVisualState($("#visual-state").val());
    VSK.enumerateVisualStates();
    VSK.redraw();
  });
  $("#state-order").on('change',function(){
    var order= parseInt( $("#state-order").val());
    if (VSK.SelectedNode && VSK.SelectedNode.visualStatesByOrder.length)
    {
     VSK.SelectedNode.setVisualStateOrder($("#visual-state").val(),order); 
     VSK.redraw();
    }
  });
  $("#delete-layer").on('click',function(){
    if(VSK.SelectedNode &&  VSK.SelectedNode.visualStatesByOrder.length )
    {
      var state = VSK.SelectedNode.visualStates[$("#visual-state").val()];
      if (state.layersByOrder.length )
      {
        if (!confirm("Do you really want to remove this layer?"))
        {
         return;
        }
        state.removeLayer( $("#layers").val());
        VSK.redraw();
      }
    }
  });
  
  $("#layers").bind('change',function(){
     $("#enable-layer").off();
     $("#expand-layer").off(); 
     var ob = VSK.getLayerObject();
     if (!ob)
     {
      return;
     }
     $("#enable-layer")[0].checked = ob.enable; 
     $("#expand-layer")[0].checked = ob.autoExpand; 
     $("#layer-order").val($("#layers").val());
     $("#layer-x-offset").val(ob.xOffset);
     $("#layer-y-offset").val(ob.yOffset);
     $("#layer-angle").val(ob.angle);
     $("#expand-layer").on('click',VSK.expandLayer);
     $("#enable-layer").on('click',VSK.enableLayer);
     VSK.redraw();
  });
  $("#enable-layer").on('click',VSK.enableLayer);
  $("#expand-layer").on('click',VSK.expandLayer);
  $("#layer-order").on('change',function(){
    var obj = VSK.getVisualStateObject();
    if (!obj)
    { 
      return;
    }
    var ord  = parseInt($("#layer-order").val());
    if ( isNaN(ord))
    {
      alert('Invalid order must be an number');
      return;
    }
    obj.renameLayer($("#layers").val(),ord);
    VSK.enumerateLayersOfState();
    VSK.redraw();
  });
  $("#layer-x-offset").on('change',function(){
    var obj = VSK.getLayerObject();
    if (!obj)
    {
      return;
    }
    var offset = parseInt($("#layer-x-offset").val());
    if ( isNaN(offset))
    {
      alert('Invalid xOffset must be an number');
      return;
    }
    obj.xOffset = offset;
    VSK.redraw();
  })
  $("#layer-angle").on('change',function(){
    var obj = VSK.getLayerObject();
    if (!obj)
    {
      return;
    }
    var offset = parseInt($("#layer-angle").val());
    if ( isNaN(offset))
    {
      alert('Invalid angle must be an number');
      return;
    }
    obj.angle = offset;
    VSK.redraw();
  })

  $("#layer-y-offset").on('change',function(){
    var obj = VSK.getLayerObject();
    if (!obj)
    {
      return;
    }
    var offset = parseInt($("#layer-y-offset").val());
    if ( isNaN(offset))
    {
      alert('Invalid yOffset must be an number');
      return;
    }
    obj.yOffset = offset;
    VSK.redraw();
  })
  $("#refresh-worlds").bind('click',function(){
    VSK.readWorldsDirectory();
  });
  
  $("#reload-world").bind('click',VSK.loadWorld);

  $("#save-world").bind('click',function(){
    VSK.saveCurrentWorld();
  });
  $("#world-list").bind('change',function(){
    if (VSK.changes)  
    {
      if (confirm('Seems that this world has been altered, do you want to save changes?'))
      {
        VSK.saveCurrentWorld();
      }
    }
    if (VSK.Objs[0] )
    {
      VSK.SelectedNode = SKNode.SelectedNode = VSK.selectedParent = VSK.Objs[0];
    }
    else
    {
      VSK.SelectedNode = SKNode.SelectedNode = VSK.selectedParent = null;
    }
    VSK.worldName = $("#world-list").val(); 
    VSK.loadWorld();
  });
  $("#new-world").bind('click',function(){
    if (VSK.changes)  
    {
      if (confirm('Seems that this world has been altered, do you want to save changes?'))
      {
        VSK.saveCurrentWorld();
      }
    }
    VSK.worldName = null;
    VSK.Objs = [];
    VSK.SelectedNode = VSK.selectedParent = SKNode.SelectedNode = null;
    VSK.saveCurrentWorld();
    setTimeout(VSK.readWorldsList,220);
  });
  $("#erase-world").bind('click',function(){
    VSK.deleteWorld();
  });
  $("#enable-nodes").bind('click',function(){
    VSK.drawNodes = $(this)[0].checked; 
    VSK.redraw();
  });
  $("#enable-links").bind('click',function(){
    VSK.drawLinks = $(this)[0].checked; 
    VSK.redraw();
  });
  $("#enable-visualStates").bind('click',function(){
    VSK.drawVisualStates = $(this)[0].checked; 
    VSK.redraw();
  });

  /*on startup*/
  VSK.readAssetDirectory();
  VSK.readWorldsDirectory();
});

