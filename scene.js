import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const scene=new T.Scene();scene.background=new T.Color('#151d32');scene.fog=new T.FogExp2('#151d32',.018);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;document.body.appendChild(renderer.domElement);
const camera=new T.PerspectiveCamera(36,innerWidth/innerHeight,.1,100);camera.position.set(14,12,17);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.4,0);controls.enableDamping=true;controls.minDistance=10;controls.maxDistance=30;controls.maxPolarAngle=Math.PI*.48;controls.enablePan=true;
scene.add(new T.HemisphereLight('#a4c6ef','#514477',2));const moon=new T.DirectionalLight('#b8d6ff',2.8);moon.position.set(-6,14,8);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-10,right:10,top:10,bottom:-10});scene.add(moon);
const palette={cream:'#e4d7ba',wall:'#96aab0',dark:'#273444',metal:'#536778',pink:'#ff9faf',green:'#63d9bd',road:'#35455c'};
const materials={};function mat(c){return materials[c] ||=new T.MeshToonMaterial({color:c});}
const outline=new T.LineBasicMaterial({color:'#182638',transparent:true,opacity:.48});
function box(w,h,d,x,y,z,c,edge=true){const g=new T.BoxGeometry(w,h,d),m=new T.Mesh(g,typeof c==='string'?mat(c):c);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);if(edge){const e=new T.LineSegments(new T.EdgesGeometry(g),outline);m.add(e);}return m;}
function cyl(r,h,x,y,z,c,r2=r){const m=new T.Mesh(new T.CylinderGeometry(r2,r,h,12),mat(c));m.position.set(x,y,z);m.castShadow=true;scene.add(m);return m;}
function line(points,c,r=.025){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const m=new T.Mesh(new T.TubeGeometry(path,24,r,6,false),mat(c));scene.add(m);return m;}
function label(text,w,h,x,y,z,bg='#f7e8c8',fg='#344e61',size=60){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);ctx.fillStyle=fg;ctx.font=`bold ${size}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,128);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex}));m.position.set(x,y,z);scene.add(m);return m;}
const glow=c=>new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.3,roughness:.35});
box(12,.65,12,0,-.4,0,'#263248');box(11.9,.08,11.9,0,-.03,0,palette.road);
box(7.6,.22,6.4,.6,.1,-1.5,'#87949f');box(7.6,.09,.25,.6,.23,1.7,'#b4b9b9');
// The store is open behind transparent glazing, with a shallow roof for readable interiors.
box(6.4,.16,4.5,.3,.3,-1.5,palette.cream);box(6.4,3.25,.15,.3,1.98,-3.7,palette.wall);box(.15,3.25,4.5,-2.9,1.98,-1.5,palette.wall);box(.15,3.25,4.5,3.5,1.98,-1.5,palette.wall);
box(6.8,.25,4.8,.3,3.75,-1.5,'#42566a');box(6.85,.1,4.9,.3,3.93,-1.5,'#738696');
box(6.9,.57,.4,.3,3.36,.89,palette.cream);box(6.9,.13,.43,.3,3.56,.91,glow('#58bfae'));box(6.9,.1,.44,.3,3.16,.92,glow('#e88798'));const sign=label('雨宿り   AMAYADORI   24',6.1,.4,.3,3.36,1.105,'#f6ecd2','#296a68',72);
box(7,.13,1,.3,2.97,1.1,'#668b91');for(let x=-3;x<3.7;x+=.55)box(.025,.035,.95,x,2.89,1.12,'#a3c4c4',false);
const glass=new T.MeshPhysicalMaterial({color:'#afd9dc',transparent:true,opacity:.12,roughness:.08,metalness:.1,depthWrite:false,side:T.DoubleSide});
for(const x of [-2.83,-.95,1.3,3.42])box(.065,2.5,.085,x,1.64,.77,'#526b75');box(6.4,.08,.12,.3,.4,.77,'#526b75');box(6.4,.08,.12,.3,2.9,.77,'#526b75');
box(1.82,2.4,.025,-1.9,1.66,.79,glass,false);box(2.05,2.4,.025,2.35,1.66,.79,glass,false);
const doors=[];for(const x of [-.42,.68]){const group=new T.Group();scene.add(group);for(const [w,h,d,dx,dy,c] of [[1.08,2.4,.025,0,0,glass],[.035,2.4,.06,-.53,0,'#69858b'],[.035,2.4,.06,.53,0,'#69858b'],[1.08,.04,.06,0,1.2,'#69858b'],[1.08,.04,.06,0,-1.2,'#69858b']]){const b=box(w,h,d,0,0,0,c,false);scene.remove(b);group.add(b);b.position.set(dx,dy,0);}group.position.set(x,1.66,.81);doors.push({group,x});}label('いらっしゃいませ',1.8,.19,.15,2.71,.86,'#e9e4c9','#4b746c',70);
box(1.9,.035,.85,.15,.27,1.3,'#334c52');
// Merchandise, counter, fridges and lit ceiling panels.
const productColors=['#d88987','#e8ba6c','#84b7ae','#eee5c1','#899bc0'];
function stock(x,z,width=1.65){box(width,.18,.64,x,.55,z,'#9a9f94');for(let tier=0;tier<3;tier++){const y=.78+tier*.53;box(width,.055,.66,x,y,z,'#e7e0c9');for(let i=0;i<8;i++){const c=productColors[(i+tier)%5];box(.13,.28,.19,x-width/2+.14+i*(width-.2)/8,y+.17,z+.18,c);box(.1,.22,.16,x-width/2+.14+i*(width-.2)/8,y+.14,z-.12,c,false);}}box(width,.1,.08,x,2,z+.34,'#80b3a5');}
stock(-1.75,-1.6);stock(.3,-1.6);stock(-1.75,-2.85);
for(let i=0;i<3;i++){const x=-.55+i*1.13;box(1.05,2.24,.55,x,1.47,-3.3,'#526d76');box(.95,1.93,.03,x,1.48,-2.99,glass,false);for(let j=0;j<4;j++){box(.94,.045,.45,x,.68+j*.47,-3.2,'#dde8d5');for(let k=0;k<5;k++)cyl(.055,.26,x-.36+k*.18,.84+j*.47,-3.1,productColors[(j+k)%5]);}box(.04,1.8,.035,x-.48,1.45,-2.94,glow('#c5f2df'));}label('冷たい飲みもの',3.2,.23,.58,2.66,-2.96,'#c8e5dc','#416e6c',65);
box(1.42,.9,1.1,2.4,.84,-.2,'#c1a887');box(1.55,.12,1.2,2.4,1.34,-.2,'#efe4c9');box(.35,.28,.3,2.35,1.55,-.2,'#384954');box(.36,.25,.06,2.35,1.73,-.04,'#748f89');box(.32,.5,.36,2.85,1.65,-.6,'#494e54');label('COFFEE',.3,.12,2.85,1.7,-.405,'#eee0be','#544332',70);box(.5,.25,.38,1.92,1.52,-.45,glass);for(let i=0;i<4;i++)cyl(.045,.1,1.76+i*.1,1.52,-.44,'#e5b371');label('おでん',.45,.15,1.93,1.5,-.24,'#f3d598','#9c6049',80);
box(.6,.95,.45,3.02,.87,-1.52,'#b1a48e');for(let i=0;i<4;i++)box(.47,.2,.03,3.02,.64+i*.19,-1.27,productColors[i]);
label('新発売   おにぎり',1.2,.5,-2.79,2.15,-3.6,'#efb1a1','#524c5b',74);label('夜のひと休み',1.1,.5,2.6,2.28,-3.6,'#b9d1b5','#465a57',72);
for(const x of [-1.8,.3,2.4])box(1.3,.035,.38,x,3.56,-1.6,glow('#ffe9b5'),false);
const warm=new T.PointLight('#ffd69e',24,8,2);warm.position.set(.2,2.5,-.7);scene.add(warm);const exterior=new T.PointLight('#6de9d1',10,6,2);exterior.position.set(.2,3,1.7);scene.add(exterior);
// Vending machine, umbrella stand and bins.
box(.95,1.95,.72,-3.7,1.2,.45,'#b7ccce');box(.77,1.2,.03,-3.7,1.44,.825,glow('#bfdde0'));for(let j=0;j<3;j++)for(let i=0;i<4;i++)box(.12,.23,.06,-4+j*0+i*.19,1.85-j*.31,.86,productColors[(i+j)%5]);box(.65,.16,.08,-3.7,.56,.86,'#304350');label('DRINK',.8,.18,-3.7,2.05,.87,'#d3ece9','#388783',80);
box(.6,.65,.5,3.96,.58,.65,'#6d7e86');for(let i=0;i<3;i++){line([[3.78+i*.15,.5,.65],[3.78+i*.15,1.3,.65],[3.82+i*.15,1.42,.65],[3.9+i*.15,1.32,.65]],'#c7c8cf',.018);const u=new T.Mesh(new T.ConeGeometry(.1,.7,8),mat(['#b398bf','#8aaabd','#d3baaa'][i]));u.position.set(3.78+i*.15,.88,.65);scene.add(u);}
for(let i=0;i<2;i++){box(.55,.85,.55,4.15,.65,-.6-i*.68,'#889c99');box(.58,.12,.57,4.15,1.1,-.6-i*.68,'#ced5c6');box(.27,.11,.03,4.15,.98,-.305-i*.68,'#344a52');}
box(.68,.7,.5,3.9,.7,-2.8,'#b8c0ba');for(let i=0;i<8;i++)box(.5,.018,.02,3.9,.45+i*.065,-2.54,'#6b7b80');
// Crosswalk and marked parking, drainage and alley.
for(let i=0;i<7;i++)box(.42,.015,1.65,-4.65+i*.65,.025,3.38,'#b7c4c7',false);
for(const x of [1.6,4.6])box(.04,.012,2.1,x,.027,4.4,'#b0bfc1',false);box(3,.012,.04,3.1,.027,5.42,'#b0bfc1',false);const parking=label('止',.5,.5,3.1,.035,4.8,'#35455c','#a8babb',100);parking.rotation.x=-Math.PI/2;
for(let i=0;i<25;i++)box(.13,.025,.34,-5.5+i*.44,.03,1.98,'#263b4a',false);
for(let i=0;i<5;i++){cyl(.045,.63,-5.12,.34,-.2-i*.95,'#8197a4');}line([[-5.12,.65,0],[-5.12,.65,-4.1]],'#9aaeb4',.04);
// Bicycle in front of the side wall.
function wheel(x,y,z){const m=new T.Mesh(new T.TorusGeometry(.36,.035,8,32),mat('#263947'));m.position.set(x,y,z);scene.add(m);for(let i=0;i<8;i++){const a=i*Math.PI/4;line([[x,y,z],[x+Math.cos(a)*.33,y+Math.sin(a)*.33,z]],'#9dabb3',.007);}}
wheel(-2.6,.64,1.42);wheel(-1.3,.64,1.42);line([[-2.6,.64,1.42],[-2.13,1.2,1.42],[-1.82,.64,1.42],[-2.6,.64,1.42]],'#d4b6a4',.03);line([[-2.13,1.2,1.42],[-1.55,1.15,1.42],[-1.82,.64,1.42],[-1.3,.64,1.42],[-1.6,1.42,1.42],[-1.43,1.48,1.42]],'#d4b6a4',.03);box(.29,.08,.16,-2.14,1.27,1.42,'#344555');box(.3,.24,.27,-1.31,1.18,1.42,'#6b848b');
// Tall silhouettes, hanging wires and a warm street lamp.
cyl(.1,6,-4.45,3,-2.8,'#596676');box(1.3,.08,.12,-4.45,5.6,-2.8,'#7c8c99');for(const x of [-4.9,-4.2]){cyl(.07,.2,x,5.77,-2.8,'#b4b9b6');line([[x,5.8,-2.8],[x+3,5.1,-4.4],[5.3,5.8,-4.8]],'#28364a',.015);}cyl(.07,3.6,4.9,1.8,2,'#526b7e');line([[4.9,3.6,2],[4.9,3.95,2],[4.5,4.05,2],[4.2,3.9,2]],'#526b7e',.05);box(.48,.13,.38,4.2,3.85,2,glow('#ffe2aa'));const lamp=new T.PointLight('#ffd2a0',14,6,2);lamp.position.set(4.2,3.65,2);scene.add(lamp);
cyl(.04,2.1,-4.9,1.1,3,'#839aa8');const roadSign=label('止まれ',.58,.58,-4.9,2.05,3.02,'#b97483','#f4e7d4',94);box(.7,.7,.07,-4.9,2.05,2.98,'#b97483');
box(.85,1.1,.09,3.7,1.7,-3.4,'#a28f79');label('町内のお知らせ',.74,.18,3.7,2.09,-3.34,'#d7ccad','#514e55',68);for(let i=0;i<3;i++)label(['夏祭り','夜間注意','回覧'][i],.21,.48,3.44+i*.25,1.69,-3.34,['#b6c7b5','#d7b3aa','#b1bdd3'][i],'#5d6270',70);
// Pools borrow the sign colors as stylized soft reflections.
const pools=[];for(let i=0;i<24;i++){const x=Math.random()*10-5,z=2+Math.random()*3.6;const color=i%3===0?'#70b9ac':i%3===1?'#9baac7':'#bc9b91';const m=new T.Mesh(new T.CircleGeometry(.3+Math.random()*.4,40),new T.MeshBasicMaterial({color,transparent:true,opacity:.12,depthWrite:false}));m.rotation.x=-Math.PI/2;m.scale.y=.25+Math.random()*.3;m.position.set(x,.04,z);scene.add(m);pools.push(m);}
for(let i=0;i<18;i++)box(.05+Math.random()*.23,.005,.4+Math.random()*.7,Math.random()*6-2.7,.042,2+Math.random()*2.9,new T.MeshBasicMaterial({color:i%2?'#c9c39f':'#80c7bd',transparent:true,opacity:.12}),false);
const ripples=[];for(let i=0;i<30;i++){const m=new T.Mesh(new T.RingGeometry(.09,.1,24),new T.MeshBasicMaterial({color:'#a8ccdf',transparent:true,opacity:.2,side:T.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(Math.random()*11-5.5,.05,Math.random()*4+1.9);scene.add(m);ripples.push(m);}
const n=1800,positions=new Float32Array(n*6),speeds=[];for(let i=0;i<n;i++){const x=Math.random()*12-6,y=Math.random()*10,z=Math.random()*12-6;positions.set([x,y,z,x-.025,y+.15,z],i*6);speeds.push(5+Math.random()*4);}const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(positions,3));scene.add(new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:'#aec9e2',transparent:true,opacity:.25,depthWrite:false})));
const drops=[];for(let i=0;i<35;i++){const m=box(.009,.07+Math.random()*.12,.008,-2.7+Math.random()*6,Math.random()*2.4+.4,.85,new T.MeshBasicMaterial({color:'#c5e4e5',transparent:true,opacity:.4}),false);drops.push(m);}const drips=[];for(let i=0;i<15;i++)drips.push(box(.015,.1,.015,-3+Math.random()*6.6,Math.random()*2.8,1.58,new T.MeshBasicMaterial({color:'#bad7de',transparent:true,opacity:.5}),false));
const signal=[];cyl(.045,1.75,5.1,.9,-4.7,'#637f8c');box(.28,.75,.25,5.1,2,-4.7,'#344957');for(let i=0;i<3;i++){const m=new T.Mesh(new T.SphereGeometry(.075,12,8),glow(['#e7868a','#d4b86b','#70c1ac'][i]));m.position.set(5.1,2.24-i*.23,-4.56);scene.add(m);signal.push(m);}
let last=0;function animate(ms){requestAnimationFrame(animate);const t=ms/1000,dt=Math.min(t-last,.04);last=t;for(let i=0;i<n;i++){positions[i*6+1]-=dt*speeds[i];if(positions[i*6+1]<0)positions[i*6+1]=9;positions[i*6+4]=positions[i*6+1]+.15;}rainGeo.attributes.position.needsUpdate=true;ripples.forEach((m,i)=>{const p=(t*.7+i/30)%1;m.scale.setScalar(.3+p*3);m.material.opacity=(1-p)*.23;});drops.forEach((m,i)=>{m.position.y-=dt*(.1+i%4*.06);if(m.position.y<.4)m.position.y=2.8;});drips.forEach((m,i)=>{m.position.y-=dt*(2+i%3);if(m.position.y<.25)m.position.y=2.85;});const open=Math.pow(Math.max(0,Math.sin(t*.24)),12);doors.forEach((d,i)=>d.group.position.x=d.x+(i?1:-1)*open*.8);exterior.intensity=10+Math.sin(t*3)*.2+(Math.sin(t*17)> .997?-2:0);signal.forEach((m,i)=>m.material.emissiveIntensity=Math.floor(t/8)%3===i?1.5:.08);controls.update();renderer.render(scene,camera);}requestAnimationFrame(animate);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
