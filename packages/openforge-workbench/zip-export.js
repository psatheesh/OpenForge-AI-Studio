'use strict';
/** Dependency-free ZIP exporter. The runtime needs no external Python executable. */
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const SKIP=new Set(['.git','node_modules','__pycache__']);
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;});
function crc32(buf){let crc=0xffffffff;for(const x of buf)crc=crcTable[(crc^x)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;}
function entries(root,prefix=''){
 let found=[];
 for(const ent of fs.readdirSync(root,{withFileTypes:true})){
  if(ent.isSymbolicLink()||SKIP.has(ent.name))continue;
  const rel=prefix?prefix+'/'+ent.name:ent.name;
  const src=path.join(root,ent.name);
  if(ent.isDirectory())found.push(...entries(src,rel));
  else if(ent.isFile())found.push({rel,src});
 }
 return found;
}
function createZip(root,res){
 let offset=0,central=[];
 for(const {rel,src} of entries(root)){
  const name=Buffer.from(rel,'utf8');
  const contents=fs.readFileSync(src);
  const compressed=zlib.deflateRawSync(contents);
  if(contents.length>0xffffffff||compressed.length>0xffffffff||offset>0xffffffff)throw new Error('ZIP32 capacity exceeded');
  const crc=crc32(contents),local=Buffer.alloc(30),centralHeader=Buffer.alloc(46);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);
  local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(contents.length,22);local.writeUInt16LE(name.length,26);
  res.write(local);res.write(name);res.write(compressed);
  centralHeader.writeUInt32LE(0x02014b50,0);centralHeader.writeUInt16LE(20,4);centralHeader.writeUInt16LE(20,6);
  centralHeader.writeUInt16LE(0x800,8);centralHeader.writeUInt16LE(8,10);centralHeader.writeUInt32LE(crc,16);
  centralHeader.writeUInt32LE(compressed.length,20);centralHeader.writeUInt32LE(contents.length,24);
  centralHeader.writeUInt16LE(name.length,28);centralHeader.writeUInt32LE(offset,42);
  central.push(centralHeader,name);
  offset+=local.length+name.length+compressed.length;
 }
 let centralSize=0;
 for(const buf of central){res.write(buf);centralSize+=buf.length;}
 const end=Buffer.alloc(22),count=central.length/2;
 if(count>65535||centralSize>0xffffffff||offset>0xffffffff)throw new Error('ZIP32 capacity exceeded');
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(count,8);end.writeUInt16LE(count,10);
 end.writeUInt32LE(centralSize,12);end.writeUInt32LE(offset,16);res.end(end);
}
module.exports={createZip,crc32};
