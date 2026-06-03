// game-utils.js — pure utility functions extracted from game.js v14.0
// Loaded after gamedata.js, before game.js

function dstSq(a,b){var dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy}
function ang(a,b){return Math.atan2(b.y-a.y,b.x-a.x)}
function collideSq(a,b,extraR){var r=(a.r||0)+(b.r||0)+(extraR||0);return dstSq(a,b)<r*r}
function distPointToSegSq(px,py,x1,y1,x2,y2){var dx=x2-x1,dy=y2-y1,ls=dx*dx+dy*dy;if(ls===0)return(px-x1)*(px-x1)+(py-y1)*(py-y1);var t=((px-x1)*dx+(py-y1)*dy)/ls;t=cl(t,0,1);var nx=x1+t*dx,ny=y1+t*dy;return(px-nx)*(px-nx)+(py-ny)*(py-ny)}
function cl(v,lo,hi){return v<lo?lo:v>hi?hi:v}
function forEachLiveEnemy(g,fn){for(var i=0;i<g.enemies.length;i++){var e=g.enemies[i];if(e.hp>0&&e.spawnGraceT<=0)fn(e,i)}}
function rn(a,b){return a+Math.random()*(b-a)}
function ri(a,b){return Math.floor(rn(a,b+1))}
function localDay(){var d=new Date();return d.getFullYear()+"-"+(d.getMonth()+1<10?"0":"")+(d.getMonth()+1)+"-"+(d.getDate()<10?"0":"")+d.getDate()}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function shuf(a){for(var i=a.length-1;i>0;i--){var j=ri(0,i);var t=a[i];a[i]=a[j];a[j]=t}return a}
function pushLimited(list,item,max){if(list.length>=max)list.splice(0,list.length-max+1);list.push(item)}
function findNearestEnemy(g,ox,oy,rSq){var n=null,nd=rSq||Infinity;for(var ei=0;ei<g.enemies.length;ei++){var oe=g.enemies[ei];if(oe.hp<=0||oe.spawnGraceT>0)continue;var dx=ox-oe.x,dy=oy-oe.y,sd=dx*dx+dy*dy;if(sd<nd){nd=sd;n=oe}}return{enemy:n,distSq:nd}}
