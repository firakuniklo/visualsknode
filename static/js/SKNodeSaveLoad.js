SKNode.prototype.toJSON = function()
{
   
   var ret = {};
   var ref; 
   ret.x = this.x;
   ret.y = this.y;
   ret.fixedNorm = this.fixedNorm; 
   ret.norm = this.norm; 
   ret.alias = this.alias; 
   ret.nodeStates = {};
   ref = this.nodeStates; 
   ret.childs = [];
   for(var s in ref)
   {
     ret.nodeStates[s]={};
     ret.nodeStates[s].x = ref[s].x;
     ret.nodeStates[s].y = ref[s].y
   }
   ref = this.visualStates; 
   ret.visualStates = {};
   for(var s in ref)
   {
      ret.visualStates[s] = {};
      var retVisual = ret.visualStates[s];
      var refVisual = ref[s]; 
      retVisual.order  = refVisual.order; 
      retVisual.enable = ref[s].enable; 
      retVisual.layers = {};
      var layers = retVisual.layers; 
      var refLayers = refVisual.layers; 
      for(var l in refLayers)
      {
         layers[l] = {}
         var layer = layers[l]; 
         var refLayer = refLayers[l];
         var a = document.createElement('a');
         a.href = refLayer.img.src; 
         layer.img = a.pathname;
         layer.autoExpand = refLayer.autoExpand; 
         layer.xOffset = refLayer.xOffset; 
         layer.yOffset = refLayer.yOffset; 
         layer.enable  = refLayer.enable;
         if (refLayer.angle)
         {
           layer.angle = refLayer.angle;
         }
         else
         {
           layer.angle = 0;
         }
         
      }
   }
   this.propagate(function(child){
      ret.childs.push( child.toJSON() ) ;     
   });
   return ret;
}

SKNode.fromJSON = function(json,_parent)
{
  if (!_parent )
  {
    _parent = null; 
  }
  var _node = new SKNode(json.x,json.y,_parent,json.alias);
  _node.fixedNorm = json.fixedNorm;
  var nstates = json.nodeStates; 
  var vstates = json.visualStates;
  var childs  =  json.childs;
  for(var nst in nstates)
  {
    _node.addNodeState(nst);
    _node.nodeStates[nst].x = nstates[nst].x;
    _node.nodeStates[nst].y = nstates[nst].y;
  }
  for(var vst in vstates)
  {
    _node.addVisualState(vst,false);
    var rvstate = _node.visualStates[vst]; 
    var jlayers  = vstates[vst].layers;
    for(var layern in jlayers)
    {
      var layer = jlayers[layern];  
      var img = new Image;
      img.src = layer.img;
      rvstate.addLayer( img,layer.autoExpand ,layer.xOffset,layer.yOffset);
    }
  }
  for(var i=0; i != childs.length; i++)
  {
    _node.childs.push( SKNode.fromJSON(childs[i], _node));
  }
  return _node; 
}

