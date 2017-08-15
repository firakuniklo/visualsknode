/*The MIT License (MIT)

Copyright (c) 2015 fito@tuta.io

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var SKNode = function(x,y,_parent,alias)
{
  if ( typeof(x) == 'number')
  {
     this.x = x;
     this.y = y;
     this.parent = _parent;
     this.childs = [];
     this.layers = [];

     /*
      * Bone states represents a dx, dy or d_theta 
      * in reference with its parent node
      * */
     this.nodeStates = [];
     /**
      * Visual states are arrays of layers that contains 
      * stacks of images they can be skin, clothes or other 
      * attributes between two nodes
      * */
     this.visualStates          = [];
     this.visualStatesByOrder   = []; 

     this.currentNodeState  = null;
     this.transition   = null;
     this.stepSize     = null;  
     this.slopex       = null;
     this.slopey       = null;
     this.from         = null;
     this.to           = null;
     this.Sstep        = 0;  /*sumation of step in time*/
     this.angle        = 0;
     this.norm         = 0;
     this.alias        = alias 
     this.fixedNorm    = false;
   
  }
  else /*create from raw object*/ 
  {
     
  }
}

/*******************************Static Members ***********************/
SKNode.SelectedNode      = null; 

SKNode.CanvasWidth       = 800;

SKNode.CanvasHeight      = 600;

SKNode.NodeRadius        = 4;

SKNode.SelectedColor     = '#ff0000';

SKNode.ParentColor       = '#00ff00';

SKNode.UnselectedColor   = '#0000ff';

SKNode.SelectedParent    = '#000000';

SKNode.SelectError       = 7; 

SKNode.Zero              = 1e-12;

SKNode.Viewport          = null;


SKNode.MaxIter           = 2000;

SKNode.atan = function(y,x)
{
  if (y >= 0)
  {
    return Math.atan2(y,x);
  }
  if (y < 0)
  {
    return 2*Math.PI + Math.atan2(y,x);    
  }
}


SKNode.fuzzyCompare = function(a,b)
{
  return Math.abs(a-b) <= SKNode.SelectError; 
}


SKNode.transform = function(angle,x,y, fn)
{
  if ( SKNode.Viewport === null ) 
  { 
    throw "Invalid canvas context";
    return;
  }
  var ctx = SKNode.Viewport; 
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  ctx.translate(-x,-y);
  fn(ctx);
  ctx.restore();
  
}
SKNode.clearContext = function()
{
  SKNode.Viewport.fillStyle="#ffffff";
  SKNode.Viewport.fillRect(0,0, SKNode.CanvasWidth,SKNode.CanvasHeight); 
}

/***************************End of Static Members ***************************/

/**************************SKNode SpaceName Classes *************************/


SKNode.NodeState = function(x,y)
{
  if (typeof(x) == 'number')
  {
    this.x  = x;
    this.y  = y;
  }
}

SKNode.VisualStates = function(order)
{
  this.layers = []; /*array of image resources*/
  this.layersByOrder = [];
  this.enable = true;
  this.order = order;
}

SKNode.VisualStates.prototype.generateLayerOrder = function ()
{
   this.layersByOrder = this.layersByOrder.sort(function(a,b){
     return a-b;
   });
}

SKNode.VisualStates.prototype.addLayer=function(img,autoExpand,xOffset,yOffset)
{
   var order = this.layersByOrder.length == 0 ?
              0: this.layersByOrder[this.layersByOrder.length-1]+1;
   
   if (this.layers[order] != undefined)
   {
     order += Math.random();
   }
   this.layers[order] = new  SKNode.Layer(img,autoExpand,xOffset,yOffset);
   if (order == 0 )
   {
     this.layersByOrder = [0];
   }
   else
   {
     this.layersByOrder.push(order);
     this.generateLayerOrder();
   }

}
SKNode.VisualStates.prototype.removeLayer = function(alias)
{
  delete this.layers[alias]; 
  this.layersByOrder.splice(this.layersByOrder.indexOf(alias),1);
  this.generateLayerOrder();
}

SKNode.VisualStates.prototype.draw=function(node)
{
  if (!this.enable)
  {
    return;
  }
  var layers = this.layers; 
  var indx   = this.layersByOrder; 
  for(var i=0; i!= indx.length; i++)
  {
    layers[indx[i]].draw(node);
  }
}

SKNode.VisualStates.prototype.renameLayer=function(layer, order)
{
   var _order = order; 
   var tmp; 
   if (this.layers[layer] == undefined)
   {
     return;
   }

   if (this.layers[order] != undefined)
   {
     _order += Math.random();
   }
   tmp = this.layers[layer]; 
   delete this.layers[layer]; 
   this.layers[order] = tmp; 
   this.layersByOrder.splice( this.layersByOrder.indexOf(layer),1);
   this.layersByOrder.push(_order);
   this.generateLayerOrder();
}

SKNode.Layer = function(img , autoExpand , xOffset,yOffset,angle) 
{
  if (img instanceof Image)
  {
    this.enable = true;
    this.img = new Image()
    this.img.src = img.src;
    this.autoExpand = autoExpand === true;
    this.xOffset = ( typeof(xOffset) == 'number') ? xOffset : 0; 
    this.yOffset = ( typeof(yOffset) == 'number') ? yOffset : 0; 
    this.angle   = ( typeof(angle)   == 'number') ? angle : 0; 
    this.enable = true; 
  }
}


SKNode.Layer.prototype.draw = function (node)
{
  if(!this.enable  || !this.img )
  {
    return;
  }
  var ctx = SKNode.Viewport;
  var that = this;
  if (node.parent != null)
  {
    var ang = this.angle * Math.PI/180;
    var x =  node.parent.x+ 
             Math.sin(node.angle)*(this.xOffset - this.img.width/2);
    var y =  node.parent.y+ 
             Math.cos(node.angle)*(this.yOffset + this.img.width/2);
    SKNode.transform(node.angle-(Math.PI/2)+ang, x,y,function(ctx){
      if (!that.autoExpand) 
      {
        ctx.drawImage(that.img, x, y)
      }
      else
      {
        ctx.drawImage(that.img, x,y, that.img.width, node.norm);          
      }
    });
  }
  else
  {
    ctx.drawImage(this.img, node.x+this.xOffset, node.y+this.yOffset)
  }
  
}

/****************************End of SKNode spacename Classes ****************/

SKNode.prototype.setVisualStateOrder = function(alias, order)
{
   if (this.visualStates[alias] == undefined )
   {
     return;
   }
   this.visualStates[alias].order = order; 
   this.generateVisualStatesOrder();
}

SKNode.prototype.enableVisualState = function(alias,value,propagate)
{
  this.visualStates[alias].enable=value;
  if (!propagate)
  {
    return;
  }
  this.propagate(function(child){
    child.enableVisualState(alias,value,propagate);
  });
}



SKNode.prototype.generateVisualStatesOrder = function()
{
   var index = [];
   var keys=[];
   var vst = this.visualStates;
   for(var v in vst)
   {
      var o = vst[v].order; 
      if ( index[o+''] != undefined)
      {
        o+= Math.random();
      }
      index[o]=v;
      keys.push(o);
   }
   keys = keys.sort(function (a,b){ 
     return a - b;
   });
   console.log(keys);
   this.visualStatesByOrder=[];
   for(var k=0; k != keys.length; k++)
   {
     this.visualStatesByOrder.push(index[keys[k]]);
   }
}

SKNode.prototype.addVisualState = function (alias,propagate)
{
   var ret = false; 
   if (this.visualStates[alias] != undefined && !propagate) 
   {
      ret=true;  
   }
   else
   {
     var order; 
     if ( this.visualStatesByOrder.length > 0 )
     {
       var vsto = this.visualStatesByOrder;
       vsto = vsto[vsto.length -1]
       order = this.visualStates[vsto].order +1; 
     }
     else
     {
       order = 0;
     }
     this.visualStates[alias] = new SKNode.VisualStates(order);
     this.generateVisualStatesOrder();
   }
   if (propagate)
   {
     this.propagate(function(child){
       if ( child.addVisualState(alias,propagate))
       {
         ret=true;
       }
     });
   }
   return ret; 
}

SKNode.prototype.delVisualState = function(alias, propagate)
{
  delete this.visualStates[alias];
  if (propagate)
  {
    this.propagate(function(child){
      child.delVisualState(alias,propagate);
    });
  }
}

SKNode.prototype.delAllVisualStates = function(propagate)
{
   for (var index in this.visualStates )
     delete this.visualStates[index];
   if (propagate)
   {
     this.propagate(function(child){
      child.delAllVisualStates(propagate);
     });
   }
}



SKNode.prototype.addChild = function(x,y)
{
  this.childs.push( new SKNode(x,y,this,null));
 
  var ch = this.childs[this.childs.length-1];
  var states = this.nodeStates;
  for(var st in states)
  {
     ch.nodeStates[st] =  new SKNode.NodeState(x,y);
  }

  this.update(this);
  return this.childs[this.childs.length - 1 ];
}

SKNode.prototype.deleteNodeState = function(alias)
{
  delete this.nodeStates[alias];
  this.propagate(function(child){
    child.deleteNodeState(alias);
  });
}


SKNode.prototype.addNodeState  = function (alias)
{
  if ( this.nodeStates[alias] != undefined )
  {
    return false;
  }
  this.nodeStates[alias] =  new SKNode.NodeState(this.x,this.y);
  this.propagate(function(child){
    child.addNodeState(alias);
  });
  if ( this.parent == null )
  {
    return true;
  }
}


SKNode.prototype.loadNodeState= function(name)
{
  if ( this.nodeStates[name] == undefined ) 
  {
   return;
  }
  this.currentNodeState = this.nodeStates[name]; 
  if (this.parent != null )
  {
    this.x = this.currentNodeState.x;
    this.y = this.currentNodeState.y;
  }
  this.update();
  this.propagate(function(child){
    child.loadNodeState(name); 
  });
}

SKNode.prototype.offsetNodeStates = function(x,y){
 
  //if (this.parent != null )
  //{
    for(var st in this.nodeStates )
    {
      this.nodeStates[st].x += x;
      this.nodeStates[st].y += y;
    }
  //}
  this.propagate(function(child){
    child.offsetNodeStates(x,y); 
  });
 
}


/**
 *  Returns true when transition finished
 * */

SKNode.prototype.step = function()
{
  if (this.stepSize === null )
  {
    return true; 
  }
  if (this.Sstep == 0 && this.parent==null )
  {
    this.loadNodeState(this.from);
    this.Sstep += this.stepSize; 
    return;
  }
  var sub = true; /*child transition end? */
  var st = this.nodeStates[this.to]; 
  var bdx = SKNode.fuzzyCompare(this.x,st.x );
  var bdy = SKNode.fuzzyCompare(this.y,st.y );
  this.Sstep += this.stepSize; 
  var that = this; 
  /*last true prevents to affect states*/
  //console.log(this.parent,this.slopex, this.slopey);
  this.move((!bdx)*this.slopex,(!bdy)*this.slopey,false ,false ,false,true);
  //this.move(this.slopex,this.slopey,false ,false ,false,true);

  if (bdx && bdx) 
  {
    this.stepsWhenReach ++; 
  }
  if (this.stepsWhenReach >0 )
  {
    this.propagate(function(child){
      child.calculateTransition(that.from,that.to, that.resolution,true);
    });  
    this.propagate(function(child){
      if ( !child.step() )  
      {
        sub=false;
      }
    });
  }
  if ((bdx && bdy &&  sub==true && this.stepsWhenReach > 0 ) || 
      this.stepsWhenReach > SKNode.MaxIter
     )
  {
    if (this.parent == null)
    {
      this.loadNodeState(this.to) 
    }
    return true;
  }
  return false;
} 

SKNode.prototype.calculateTransition = function(from, to,resolution,fromHere)
{
  if (from  == to ) 
  { 
    return;
  }
  
  this.from = from;
  this.to   = to;
  this.stepSize = (1.0/resolution); 
  this.Sstep = 0;
  this.resolution = resolution;
  this.stepsWhenReach = 0; 
  var st = this.nodeStates;  
  if (!fromHere)
  {
    this.slopex  = Math.ceil((st[to].x -  st[from].x)/resolution);  
    this.slopey  = Math.ceil((st[to].y -  st[from].y)/resolution);
  }else
  {
    this.slopex  = Math.ceil((st[to].x - this.x)/resolution);  
    this.slopey  = Math.ceil((st[to].y - this.y)/resolution);
  }
}

SKNode.prototype.rotate = function(angle)
{
   this.propagate(function(child){
      var nx = child.parent.x +  Math.cos(child.angle + angle  ) * child.norm;
      var ny = child.parent.y +  Math.sin(child.angle + angle  ) * child.norm;
      var lx = child.x;
      var ly = child.y;
      child.x = nx;
      child.y = ny;
      child.angle = child.angle + angle;
     
      if ( child.currentNodeState != null )
      {
        child.currentNodeState.x = nx;
        child.currentNodeState.y = ny;
      }
      child.propagate(function(_child){
       _child.move(nx-lx,ny-ly, false ,true,false);
      });
   })
}

SKNode.prototype.propagate = function( fn , exclude ) 
{
  var ch = this.childs; 
  var ret; 
  for(var i=0; i != ch.length; i++)
  {
    if (ch[i] === exclude ) 
    {
      continue;
    }
    if ( (ret = fn(ch[i])) != undefined  )
    {
      return ret; 
    }
  }
}

/**
 * executes fn passing as argument node parent 
 * if dontReverse is true only parent is considered 
 * otherwise function is propagated over parents childs 
 * excluding current node to avoid infinite loop 
 * */

SKNode.prototype.backPropagate = function(fn, dontReverse)
{
  if (!this.parent)
  {
    return; 
  }
  if (dontReverse)
  {
    fn(this.parent);     
  }
  else
  {
    fn(this.parent);
    this.propagate(fn,this);
  }
}


SKNode.prototype.move = function(dx,dy, noPropagate,notSource,keepAngle,states)
{
  
  var noPropagateStates = states; 

  if ((!this.fixedNorm || notSource) && !keepAngle) 
  {
    this.x += dx;
    this.y += dy;
    
    if(this.parent == null && !states)
    {
      this.offsetNodeStates(dx,dy);
      noPropagateStates  = true;
    }

    if (this.currentNodeState != null && this.parent != null && !states)
    {
      this.currentNodeState.x +=dx;
      this.currentNodeState.y +=dy;
    }
    if (noPropagate)
    {
      this.update();
      return;
    }
    this.propagate(function(child){
     child.move(dx, dy,noPropagate,true,false,noPropagateStates,states ); 
    });
    this.update();
  }
  if (this.fixedNorm && !notSource && !keepAngle) 
  {
    var dtheta  = SKNode.atan(((this.y+dy)-this.parent.y),((this.x+dx)-this.parent.x) );
    var nx = this.parent.x +  Math.cos(dtheta ) * this.norm;
    var ny = this.parent.y +  Math.sin(dtheta ) * this.norm;
    var lx = this.x;
    var ly = this.y;
    this.x = nx;
    this.y = ny;
    if (this.currentNodeState != null  && !states)
    {
      this.currentNodeState.x = this.x;
      this.currentNodeState.y = this.y;
    }
    this.dangle = dtheta -this.angle; 
    this.angle = dtheta; 
    this.propagate(function(child){
     child.move(nx-lx,ny-ly, noPropagate,true,false,states);
    });
  }
  if (keepAngle) 
  {
    var nx =  this.parent.x + Math.cos( this.angle - this.angle2 ) * this.norm;
    var ny =  this.parent.y +  Math.sin( this.angle - this.angle2 ) * this.norm;
    var lx = this.x;
    var ly = this.y;
    this.x = nx;
    this.y = ny;
    if (this.currentNodeState != null )
    {
      this.currentNodeState.x +=dx;
      this.currentNodeState.y +=dy;
    }
    this.update(true);
    this.propagate(function(child){
     child.move(nx-lx,ny-ly, noPropagate,true,true ,states); 
    });
  }
  /*if (noPropagate)
  {
    return;
  }
  this.propagate(function(child){
     child.move(dx2, dy2,noPropagate,true ); 
  });*/
  
}

/**
 * 
 * */
SKNode.prototype.find = function(argva,y)
{
  var ret; 
  if ( typeof (argva) == 'number')
  {
    if (SKNode.fuzzyCompare(argva,this.x) && SKNode.fuzzyCompare(y,this.y)) 
    {
      SKNode.SelectedNode = this;
      return this; //stop propagation
    }
  }
  if ( typeof (argva) == 'string') 
  {
     if  (this.alias == argva  ) return this;
  }
  ret=this.propagate(function(child){
      return  child.find(argva,y); 
  });
  //nsole.log('returning',ret);
  return ret;
}


SKNode.prototype.remove = function(target)
{
  
  if (target != undefined) 
  {
    var ch = this.childs;
    ch.splice(ch.indexOf(target),1);
    return;
  }
  
  if (this.parent != null)
  {
     this.parent.remove(this); 
  }

}

/*
 * updates distance and angle from parent to child
 * and stores the value in childs members 
*/
SKNode.prototype.update = function(noPropagate)
{
  var dx;
  var dy;
  if (this.parent != null)
  {
    dx = (this.x - this.parent.x );
    dy = (this.y - this.parent.y );
    this.norm = Math.sqrt( dx*dx + dy*dy);
    this.angle = SKNode.atan(dy,dx);
    var _parent = this.parent.parent; 
    if (_parent!= null)
    {
       dx = (this.x - _parent.x );
       dy = (this.y - _parent.y );
       this.norm2 = Math.sqrt( dx*dx + dy*dy);
       this.angle2 = SKNode.atan(dy,dx);
    }
  }
  if(noPropagate)
  {
    return;
  }
  this.propagate(function(child){
    child.update();    
  });
}

SKNode.prototype.drawVisualStates = function()
{
   var sto = this.visualStatesByOrder; 
   var vst = this.visualStates; 
   for(var s=0; s != sto.length; s++)
   {
     if (vst[sto[s]] != undefined) 
       vst[sto[s]].draw(this);
   }
   this.propagate(function(child){
     child.drawVisualStates();
   });
}

SKNode.prototype.drawNode = function(noPropagate)
{
  var ctx = SKNode.Viewport;
  if (this.parent == null && this != SKNode.SelectedNode )
  {
    ctx.fillStyle = SKNode.ParentColor;  
  }

  if (this.parent == null && this == SKNode.SelectedNode )
  {
    ctx.fillStyle = SKNode.SelectedParent; 
  }

  if (this.parent != null && this != SKNode.SelectedNode)
  {
    ctx.fillStyle = SKNode.UnselectedColor;
  }

  if (this.parent != null && this == SKNode.SelectedNode)
  {
    ctx.fillStyle = SKNode.SelectedColor;
  }

  ctx.beginPath();
  ctx.arc(this.x,this.y, SKNode.NodeRadius,0,Math.PI * 2);
  ctx.fill();

  if (noPropagate)
  {
    return;
  }
  this.propagate (function(child){
    child.drawNode();
  })

}

SKNode.prototype.drawLinks = function(noPropagate)
{
  if (this.parent != null)
  {
    var ctx = SKNode.Viewport;
    ctx.beginPath(); 
    ctx.lineWidth="1";
    ctx.strokeStyle="black";
    ctx.moveTo(this.x,this.y);
    ctx.lineTo(this.parent.x,this.parent.y);
    ctx.stroke();
  }
  if(noPropagate)
  {
    return;
  }
  this.propagate (function(child){
    child.drawLinks(); 
  })
}

