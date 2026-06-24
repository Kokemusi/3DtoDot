import * as Three from "three/webgpu";
import * as render from "ThreeDHandle";
import * as keyStatus from "key_stats";

//pen setting
let pen = {
	get color(){return new Three.Color(document.getElementById("pallet").value)},
	mode:document.getElementById("pen_mode").value,
	lastPut:undefined,
	update(){
		this.mode = document.getElementById("pen_mode").value;
	}
};

class preview{
	constructor(canvas, dir, dot, view, layer = undefined){
		this.canvas = canvas;
		this.ctx = this.canvas.getContext("2d");
		this.ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
		this.data = this.ImageData.data;
		this.dir = (dir%4+4)%4;
		console.log(dir, this.dir)
		this.dot = dot;
		this.view = (view%4+4)%4;
		this.layer = layer;
		this.minY = -32;
		this.maxY = 32;
		this.minX = -32;
		this.maxX = 32;
		this.shadow = 1;
	}
	get2dPos(pos){
		let xz = this.getPos(pos.x + 0.5, pos.z + 0.5);
		return {x:(xz.x - xz.z)/2 -1, y:((xz.x + xz.z)/2-pos.y)/2-0.5};
	}
	setColor(i, r, g, b, a){
		this.data[4 * i] = r;
		this.data[4 * i + 1] = g;
		this.data[4 * i + 2] = b;
		this.data[4 * i + 3] = a;
	}
	createImage(map){
		this.ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
		this.data = this.ImageData.data;
		for(let i = 0; i < this.data.length / 4; i++){
			this.setColor(i, 255, 255, 255, 0);
		}
		for(const box of map){
				let x = Math.floor(this.dot*this.get2dPos(box.pos).x) - this.minX;
				let y = Math.floor(this.dot*this.get2dPos(box.pos).y) - this.minY;
			if(box.color != "transparent"){
				let dotMap = [
					[0,0,0,0],
					[0,0,0,0],
					[1,1,2,2],
					[1,1,2,2]
				];
				let faceMap = [
					["(0,1,0)","(0,0,1)","(1,0,0)"],
					["(0,1,0)","(-1,0,0)","(0,0,1)"],
					["(0,1,0)","(0,0,-1)","(-1,0,0)"],
					["(0,1,0)","(1,0,0)","(0,0,-1)"]
				];
				for(let i = 0; i < this.dot; i++){
					for(let j = 0; j < this.dot; j++){
						let CS = dotMap[Math.floor(j/this.dot*4)][Math.floor(i/this.dot*4)];
						let c = new Three.Color(box.color);
						if(Object.keys(box).includes(faceMap[this.dir][CS])){
							c = new Three.Color(box[faceMap[this.dir][CS]]);
						};
						c = c.convertLinearToSRGB();
						if(CS != undefined){
							if(CS != 0){
								CS += this.view;
								CS = (CS - 1) % 4 + 1;
								CS *= this.shadow;
							}
							this.setColor((x + i) + (y + j) * this.canvas.width, 255 * (16 - CS * 2) / 16 * c.r, 255 * (16 - CS * 2) / 16 * c.g, 255 * (16 - CS * 2) / 16 * c.b, 255);
						}
					}
				}
			}else{
				for(let i = 0; i < this.dot; i++){
					for(let j = 0; j < this.dot; j++){
						this.setColor((x + i) + (y + j) * this.canvas.width, 0, 0, 0, 0);
					}
				}
			}
		}
		this.ctx.putImageData(this.ImageData, 0, 0);
	}
	getDist(pos){
		return this.getPos(pos.x, pos.z).x + pos.y + this.getPos(pos.x, pos.z).z;
	}
	compare(a,b){
		let d = this.getDist(a.pos) - this.getDist(b.pos);
		if(d != 0){
			return d;
		}
		d = a.pos.y - b.pos.y;
		if(d != 0){
			return d;
		}
		d = a.pos.x - b.pos.x;
		if(d != 0){
			return d;
		}
		d = a.pos.z - b.pos.z;
		return d;
	}
	update(map){
		let MAP = [];
		if(this.layer != "" && this.layer != undefined){
			if(Object.keys(map).length > 0){
				let map_temp = [];
				for(const obj in map){
					if(obj != "version"){
						if(obj == this.layer || this.layer == "all"){
							for(const box in map[obj]){
								map_temp.push(JSON.parse(JSON.stringify(map[obj][box])));
								MAP.push(JSON.parse(JSON.stringify(map[obj][box])));
							}
						}else{
							for(const box in map[obj]){
								MAP.push(JSON.parse(JSON.stringify({pos:map[obj][box].pos, color : "transparent"})));
							}
						}
					}
				}
				this.minY = -0;
				this.maxY = 0;
				this.minX = -0;
				this.maxX = 0;
				for(const box in map_temp){
					if(this.maxX <= Math.floor(this.dot*this.get2dPos(map_temp[box].pos).x)){
						this.maxX = Math.floor(this.dot*this.get2dPos(map_temp[box].pos).x);
					}else if(this.minX >= Math.floor(this.dot*this.get2dPos(map_temp[box].pos).x)){
						this.minX = Math.floor(this.dot*this.get2dPos(map_temp[box].pos).x);
					}
					if(this.maxY <= Math.floor(this.dot*this.get2dPos(map_temp[box].pos).y)){
						this.maxY = Math.floor(this.dot*this.get2dPos(map_temp[box].pos).y);
					}else if(this.minY >= Math.floor(this.dot*this.get2dPos(map_temp[box].pos).y)){
						this.minY = Math.floor(this.dot*this.get2dPos(map_temp[box].pos).y);
					}
				}
				this.canvas.width = this.maxX - this.minX + this.dot;
				this.canvas.height = this.maxY - this.minY + this.dot;
				MAP.sort((a,b)=>(this.compare(a, b)));
				this.createImage(MAP);
			}
		}
	}
	getPos(x, z){
		return {x:x*Math.round(Math.cos(-this.dir*Math.PI/2))-z*Math.round(Math.sin(-this.dir*Math.PI/2)), z:x*Math.round(Math.sin(-this.dir*Math.PI/2))+z*Math.round(Math.cos(-this.dir*Math.PI/2))}
	}
	toggleShadow(){
		this.shadow = 1 - this.shadow;
	}
}

class Previews{
	constructor(element, margeID, dot = 8){
		this.element = document.getElementById(element);
		this.marge = document.getElementById(margeID);
		this.ctx = this.marge.getContext("2d");
		this.canvas = {};
		this.preview = {};
		this.dot = dot;
	}
	createPreviewCanvas(){
		let ViewDict = ["se", "ne", "nw", "sw"];
		let DirDict = ["0", "1", "2", "3"];
		
		for(let i = 0; i < DirDict.length; i++){
			this.canvas[DirDict[i]] = {};
			this.preview[DirDict[i]] = {};
			for(let j = 0; j < ViewDict.length; j++){
				this.canvas[DirDict[i]][ViewDict[j]] = document.createElement("canvas");
				this.canvas[DirDict[i]][ViewDict[j]].style.position = "absolute";
				this.canvas[DirDict[i]][ViewDict[j]].id = "Preview_" + DirDict[i] + "_" + ViewDict[j];
				this.element.appendChild(this.canvas[DirDict[i]][ViewDict[j]]);
				this.preview[DirDict[i]][ViewDict[j]] = new preview(this.canvas[DirDict[i]][ViewDict[j]], i - j, this.dot, j);
			}
		}
	}
	update(map){
		for(const dir in this.preview){
			for(const view in this.preview[dir]){
				this.preview[dir][view].update(map);
			}
		}
	}
	setObject(Object, map){
		for(const dir in this.preview){
			for(const view in this.preview[dir]){
				this.preview[dir][view].layer = Object;
			}
		}
		this.update(map);
	}
	doMarge(boolean = false, name){
		let width = 0;
		let max_height = 0;
		let exporting = {};
		for(const dir in this.canvas){
			let max_width = 0;
			let height = 0;
			for(const view in this.canvas[dir]){
				if(this.canvas[dir][view].width > max_width) max_width = this.canvas[dir][view].width;
				height += this.canvas[dir][view].height;
				exporting[name + "_" + dir + "_" + view] = {}
			}
			width += max_width;
			if(height > max_height) max_height = height;
		}
		this.marge.width = width;
		this.marge.height = max_height;
		let OriginX = 0;
		for(const dir in this.canvas){
			let OriginY = 0;
			let max_width = 0;
			for(const view in this.canvas[dir]){
				this.ctx.drawImage(this.canvas[dir][view], OriginX, OriginY);
				exporting[name + "_" + dir + "_" + view] = {
					ox:Math.floor(this.preview[dir][view].dot*this.preview[dir][view].get2dPos({x:0, y:0, z:0}).x - this.preview[dir][view].minX),
					oy:Math.floor(this.preview[dir][view].dot*this.preview[dir][view].get2dPos({x:0, y:0, z:0}).y - this.preview[dir][view].minY),
					ix:OriginX,
					iy:OriginY,
					iw:this.canvas[dir][view].width,
					ih:this.canvas[dir][view].height
				}
				if(this.canvas[dir][view].width > max_width) max_width = this.canvas[dir][view].width;
				OriginY += this.canvas[dir][view].height;
			}
			OriginX += max_width;
		}
		if(boolean){
			return exporting;
		}
	}
	toggleShadow(map){
		for(const dir in this.preview){
			for(const view in this.preview[dir]){
				this.preview[dir][view].toggleShadow();
			}
		}
		this.update(map);
		this.doMarge();
	}
}

let grid = {hit:{x:0,y:0,z:0},place:{x:0,y:0,z:0}};
let map_mesh;
let hitCheck = 0;
let hitIndex;
let hitObj;
let hitFace;
let hitColor;
let phitIndex;
let placeIndex;
let pplaceIndex;
let hitPos;
let Fill = {p1:{x:0,y:0,z:0,set:0},p2:{x:0,y:0,z:0,set:0}};
let Preview = new Previews("preview-box", "export");
Preview.createPreviewCanvas();
Preview.doMarge();
let editingObject = undefined;
let exportingObject = undefined;

//input setting
let resolution = document.getElementById("resolution").value;
let show_edge = ()=>{
	let elm = document.getElementById("show_edge");
	return elm.value;
}
let ledge = show_edge();
let z = new keyStatus.keyStatus("z");
let Z = new keyStatus.keyStatus("Z");
let ctrl = new keyStatus.keyStatus("Control");
let shft = new keyStatus.keyStatus("Shift");
const canvas1 = document.getElementById("canvas1");
canvas1.oncontextmenu = ()=>{return false};
let mouse = new keyStatus.mouse(canvas1);
let rot = {H:0,V:0};
function NotInMap(key, MAP){
	for(const part in MAP){
		if(part != "version"){
			if(Object.keys(MAP[part]).includes(key)) return false;
		}
	}
	return true;
}
function meshMAP(project){
	const material = new Three.MeshBasicMaterial({vertexColors : true, side: Three.DoubleSide});
	const geometry = new Three.BufferGeometry();
	const edgeGeometry = new Three.BufferGeometry();
	const edgeMaterial = new Three.LineBasicMaterial({color:0x000000});
	let box_object = [];
	let MAP = {};
	let layerHTML = "<label for = 'Layer'>EDITING LAYER</label><select id = 'Layer'>";
	let exportHTML = "<label for = 'exportStyle'>EXPORTING LAYER</label><br><select id = 'exportStyle'><option value = 'all'>ALL</option>"
	for(const part in project){
		if(part != "version"){
			layerHTML = layerHTML + "<option value = '" + part + "' ";
			exportHTML = exportHTML + "<option value = '" + part + "' ";
			if(part == editingObject){
				layerHTML = layerHTML + "selected";
			}
			if(part == exportingObject){
				exportHTML = exportHTML + "selected";
			}
			layerHTML = layerHTML + ">" + part + "</option>";
			exportHTML = exportHTML + ">" + part + "</option>";
			for(const box in project[part]){
				MAP[box] = project[part][box];
				box_object.push(part);
			}
		}
	}
	layerHTML = layerHTML + "</select>";
	exportHTML = exportHTML + "</select>";
	if(Object.keys(project).length > 1){
		document.getElementById("layer-controller").innerHTML = layerHTML;
		document.getElementById("exportConfig").innerHTML = exportHTML;
	}
	if(Object.keys(MAP).length>0){
		let faceV = [{x : -1, y : 0, z : 0}, {x : 1, y : 0, z : 0}, {x : 0, y : -1, z : 0}, {x : 0, y : 1, z : 0}, {x : 0, y : 0, z : -1}, {x : 0, y : 0, z : 1}];
		let faceL = [
			[0,1,3,2],
			[4,5,7,6],
			[0,1,5,4],
			[2,3,7,6],
			[0,2,6,4],
			[1,3,7,5]
		];
		let facePc = [];
		for(let i = 0; i < 2; i++){
			for(let j = 0; j < 2; j++){
				for(let k = 0; k < 2; k++){
					facePc.push({x:i,y:j,z:k});
				}
			}
		}
		let end = [];
		let apexes = [];
		let colors = [];
		let indices = [];
		let faceIndices = [];
		let step = 0;
		for(const cord in MAP){
			let x = MAP[cord].pos.x;
			let y = MAP[cord].pos.y;
			let z = MAP[cord].pos.z;
			let c = new Three.Color(MAP[cord].color);
			let firstP = apexes.length/3;
			for(let v in faceV){
				let checkside = "(" + (x + faceV[v].x) + "," + (y + faceV[v].y) + "," + (z + faceV[v].z) + ")";
				if(!(Object.keys(MAP).includes(checkside))){
					//CubeFace
					let face = "(" + faceV[v].x + "," + faceV[v].y + "," + faceV[v].z + ")";
					if(!Object.keys(MAP[cord]).includes(face)){
						c = new Three.Color(MAP[cord].color);
					}else{
						c = new Three.Color(MAP[cord][face]);
					}
					let faceStart = apexes.length/3;
					for(let i = 0; i < 2 - Math.abs(faceV[v].x); i++){
						for(let j = 0; j < 2 - Math.abs(faceV[v].y); j++){
							for(let k = 0; k < 2 - Math.abs(faceV[v].z); k++){
								apexes.push(x + i + Math.max(0, faceV[v].x));
								apexes.push(y + j + Math.max(0, faceV[v].y));
								apexes.push(z + k + Math.max(0, faceV[v].z));
								colors.push(c.r, c.g, c.b);
							}
						}
					}
					faceIndices.push({object:box_object[step], pos:("(" + x + "," + y + "," + z + ")"), face:faceV[v], color:c});
					faceIndices.push({object:box_object[step], pos:("(" + x + "," + y + "," + z + ")"), face:faceV[v], color:c});
					indices.push(faceStart);
					indices.push(faceStart + 1);
					indices.push(faceStart + 3);
					indices.push(faceStart + 0);
					indices.push(faceStart + 2);
					indices.push(faceStart + 3);
					//EdgeLine
					for(let si = 0; si <= 3; si++){
						for(let i = si; i <=1 + si; i++){
							end.push(x + facePc[faceL[faceV.indexOf(faceV[v])][i%4]].x);
							end.push(y + facePc[faceL[faceV.indexOf(faceV[v])][i%4]].y);
							end.push(z + facePc[faceL[faceV.indexOf(faceV[v])][i%4]].z);
						}
					}
				}
			}
			step++;	
		}
		geometry.setAttribute("position", new Three.Float32BufferAttribute(apexes, 3));
		geometry.setAttribute("color", new Three.Float32BufferAttribute(colors, 3));
		geometry.setIndex(indices);
		edgeGeometry.setAttribute("position", new Three.Float32BufferAttribute(end, 3));
		return {mesh:new Three.Mesh(geometry, material), edge:new Three.LineSegments(edgeGeometry, edgeMaterial) , index:faceIndices};
	}
	return {mesh:undefined, index:undefined};
}

//screen setting
let baseWidth = window.innerWidth;
let baseHeight = window.innerHeight;
let mainCam = {x:20,y:20,z:20,tx:0,ty:0,tz:0, zoom:1,range:24, cx:0, cy:0, dist:0};
let mainScreen = new render.renderer(tick, "canvas1", {width:baseWidth*2/3, height:baseHeight});
mainScreen.addCamera("main", {range:24, opt:mainCam});
let axisScreen = new render.renderer(tick, "axis_canvas", {width:40, height:40});
axisScreen.transparent();
axisScreen.addCamera("main", {range:24, opt:mainCam});
let map = {version:"0622"};
let temp = {};
let editHistory = [{}];
let histIndex = undefined;
let undo_check = 0;
let edited = 0;

document.getElementById("load").addEventListener("click",()=>{
	let input = window.prompt("paste save data(leave it blank if adding new layer)");
	let newLayer;
	if(input != ""){
		input = JSON.parse(input);
		if(Object.keys(input).includes("version")){
			map = {...map, ...JSON.parse(JSON.stringify(input))};
		}else{

			let map_temp = {version:"0622"};
			let loadingObject = "(" + window.prompt("type in loading object name") + ")";
			newLayer = loadingObject;
			map_temp[loadingObject] = {};
			for(const box in input){
				map_temp[loadingObject][box] = JSON.parse(JSON.stringify(input[box]));
			}
			map = [...map, ...JSON.parse(JSON.stringify(map_temp))];
		}
	}else{
		newLayer = "(" + window.prompt("type in new object name") + ")";
		map[newLayer] = {};
	}
	mainScreen.delete(map_mesh.mesh);
	mainScreen.delete(map_mesh.edge);
	map_mesh = meshMAP(map);
	if(input != ""){
		if(newLayer != undefined){
			document.getElementById("Layer").value = newLayer;
		}
	}else{
		document.getElementById("Layer").value = newLayer;
	}
	mainScreen.add(map_mesh.mesh);
	mainScreen.add(map_mesh.edge);
	edited = 1;
	Preview.update(map);
});
document.getElementById("save").addEventListener("click",()=>{
	navigator.clipboard.writeText(JSON.stringify(map)).then(()=>{window.alert("copied to clipboard")},()=>{window.alert("faild to copy")});
});
document.getElementById("saveLayer").addEventListener("click",()=>{
	let saving = {version:"0622"};
	saving[editingObject] = map[editingObject];
	navigator.clipboard.writeText(JSON.stringify(saving)).then(()=>{window.alert("copied to clipboard")},()=>{window.alert("faild to copy")});
});
document.getElementById("removeLayer").addEventListener("click",()=>{
	if(window.prompt("enter deleting layer name") == editingObject){
		delete map[editingObject];
		mainScreen.delete(map_mesh.mesh);
		mainScreen.delete(map_mesh.edge);
		map_mesh = meshMAP(map);
		mainScreen.add(map_mesh.mesh);
		mainScreen.add(map_mesh.edge);
		edited = 1;
	}
});
document.getElementById("LAOrigin").addEventListener("click",()=>{
	mainCam.tx = 0;
	mainCam.ty = 0;
	mainCam.tz = 0;
});
document.getElementById("LAA").addEventListener("click",()=>{
	pen.mode = "anchor";
});
document.getElementById("shadow").addEventListener("click",()=>{
	Preview.toggleShadow(map);
});
document.getElementById("do_export").addEventListener("click",async ()=>{
	const name = window.prompt("set name");
	const data = JSON.stringify(Preview.doMarge(true, name), null, "\t");
	const handle = await window.showSaveFilePicker({
		suggestedName: name,
		types:[{
			description:"JSON File",
			accept:{
				"application/json":[".json"]
			}
		}]
	});
	const writable = await handle.createWritable();
	await writable.write(data);
	await writable.close();
});
let plane = new Three.Mesh(new Three.PlaneGeometry(100,100),new Three.MeshBasicMaterial({visible:false}));

plane.rotation.x = -Math.PI/2;
mainScreen.add(plane);
mainScreen.add(new Three.GridHelper(16, 16, 0xFFFFFF, 0x202020));
axisScreen.add(new Three.AxesHelper(16));
map_mesh = meshMAP(map);
mainScreen.add(map_mesh.mesh);
mainScreen.add(map_mesh.edge);

const tempGeometry = new Three.BoxGeometry(1,1,1);
const tempMaterial = new Three.MeshBasicMaterial({color:0xff0000, transparent:true, opacity:0.3, depthWrite:false});
function tick(){
	if(document.getElementById("exportStyle") != null && exportingObject != document.getElementById("exportStyle").value){
		exportingObject = document.getElementById("exportStyle").value;
		Preview.setObject(exportingObject, map);
		Preview.doMarge();
	}
	if(document.getElementById("Layer") != null && editingObject != document.getElementById("Layer").value){
		editingObject = document.getElementById("Layer").value;
	}
	if(pen.mode != "anchor"){
		pen.update();
	}
	if(show_edge() != ledge){
		if(show_edge() == "Hide"){
			mainScreen.delete(map_mesh.edge);
		}else if(show_edge() == "Show"){
			mainScreen.add(map_mesh.edge);
		}
	}
	ledge = show_edge();
	mainScreen.setResolution(document.getElementById("resolution").value);
	mainCam.zoom = document.getElementById("zoom").value;
	mouse.mode("auto");
	mainCam.x-=mainCam.tx;
	mainCam.y-=mainCam.ty;
	mainCam.z-=mainCam.tz;
	let cos = mainCam.z/(mainCam.x**2+mainCam.z**2);
	let sin = mainCam.x/(mainCam.x**2+mainCam.z**2);
	let siny = mainCam.y/(mainCam.x**2+mainCam.y**2+mainCam.z**2);
	let cosy = Math.sqrt((mainCam.x**2+mainCam.z**2))/(mainCam.x**2+mainCam.y**2+mainCam.z**2);
	mainCam.x+=mainCam.tx;
	mainCam.y+=mainCam.ty;
	mainCam.z+=mainCam.tz;
	if(mouse.onit == 1){
		mouse.mode("crosshair");
		hitPos = mainScreen.castRay(mouse.pos());
		if(hitPos.length > 0){
			hitColor = new Three.Color(0,0,0);
			hitObj = undefined;
			if(hitPos[0].object.geometry.type == "BufferGeometry"){
				hitIndex = map_mesh.index[hitPos[0].faceIndex].pos;
				hitObj = map_mesh.index[hitPos[0].faceIndex].object;
				grid.hit = JSON.parse(JSON.stringify(map[hitObj][hitIndex].pos));
				grid.place = {x:grid.hit.x + map_mesh.index[hitPos[0].faceIndex].face.x, y:grid.hit.y + map_mesh.index[hitPos[0].faceIndex].face.y, z:grid.hit.z + map_mesh.index[hitPos[0].faceIndex].face.z};
				hitFace = "(" + map_mesh.index[hitPos[0].faceIndex].face.x + "," + map_mesh.index[hitPos[0].faceIndex].face.y + "," + map_mesh.index[hitPos[0].faceIndex].face.z + ")";
				hitColor = map_mesh.index[hitPos[0].faceIndex].color;
			}else if(hitPos[0].object.geometry.type == "BoxGeometry"){
				grid.hit.x = hitPos[0].object.position.x-0.5;
				grid.hit.y = hitPos[0].object.position.y-0.5;
				grid.hit.z = hitPos[0].object.position.z-0.5;
				grid.place.x = grid.hit.x + hitPos[0].face.normal.x;
				grid.place.y = grid.hit.y + hitPos[0].face.normal.y;
				grid.place.z = grid.hit.z + hitPos[0].face.normal.z;
				hitObj = "Temporary";
			}else{
				grid.hit = {x:Math.floor(hitPos[0].point.x), y:Math.floor(hitPos[0].point.y+0.5), z:Math.floor(hitPos[0].point.z)}
				grid.place = {x:grid.hit.x, y:grid.hit.y, z:grid.hit.z};
			}
			hitIndex = "(" + grid.hit.x + "," + grid.hit.y + "," + grid.hit.z + ")";
			placeIndex = "(" + grid.place.x + "," + grid.place.y + "," + grid.place.z + ")";
			document.getElementById("position").textContent = "Grid(hit: " + hitIndex + ", place: " + placeIndex + ", hit layer: " + hitObj;
		}
		if(mouse.status == 1 && mouse.button == 1){
			mouse.mode("all-scroll");
			rot.H = -3*mouse.vx;
			rot.V = 3*mouse.vy;
		}else if(mouse.status == 1 && mouse.button == 0 && pen.mode == "dropper"){
				document.getElementById("pallet").value = hitColor.getStyle();

		}else if(mouse.status == 1 && mouse.button == 0 && pen.mode == "anchor"){
			if(hitCheck == 0){
				mainCam.tx = grid.hit.x+0.5;
				mainCam.ty = grid.hit.y+0.5;
				mainCam.tz = grid.hit.z+0.5;
				if(Object.keys(temp).includes(hitIndex)){
					for(const TEMP in temp){
						mainScreen.delete(temp[TEMP]);
					}
					temp = {};
				}
				hitCheck = 1;
			}
		}else if(mouse.status == 1 && mouse.button == 0 && pen.mode == "pen"){
			if(editingObject != undefined){
				if((hitCheck == 0 || hitIndex != pen.lastPut) && hitPos.length > 0){
					hitCheck = 1;
					if(Object.keys(temp).includes(hitIndex)){
						for(const TEMP in temp){
							mainScreen.delete(temp[TEMP]);
							delete temp[TEMP];
						}
						temp = {};
					}
					pen.lastPut = placeIndex;
					mainScreen.delete(map_mesh.mesh);
					mainScreen.delete(map_mesh.edge);
					map[editingObject][placeIndex] = {pos:{x:grid.place.x, y:grid.place.y, z:grid.place.z}, color:pen.color};
					edited = 1;
					map_mesh = meshMAP(map);
					mainScreen.add(map_mesh.mesh);
					if(show_edge() == "Show") mainScreen.add(map_mesh.edge);
				}
			}else{
				if(hitCheck == 0){
					window.alert("Make Layer First");
					hitCheck = 1;
				}
			}
		}else if(mouse.status == 1 && mouse.button == 0 && pen.mode == "temp"){
			if(hitCheck == 0 && hitPos.length > 0){
				hitCheck = 1;
				temp[placeIndex] = (new Three.Mesh(tempGeometry,tempMaterial));
				temp[placeIndex].position.set(grid.place.x+0.5, grid.place.y+0.5, grid.place.z+0.5);
				mainScreen.add(temp[placeIndex]);
			}
		}else if(mouse.status == 1 && mouse.button == 0 && pen.mode == "brush"){
			if((hitCheck == 0 || hitIndex != phitIndex) && hitPos.length > 0 && hitObj == editingObject){
				if(hitPos[0].object.geometry.type == "BufferGeometry"){
					if(map[editingObject][hitIndex].color != pen.color){
						hitCheck = 1;
						mainScreen.delete(map_mesh.mesh);
						mainScreen.delete(map_mesh.edge);
						map[editingObject][hitIndex].color = pen.color;
						for(const face of Object.keys(map[editingObject][hitIndex])){
							if(face != "color" && face != "pos"){
								delete map[editingObject][hitIndex][face];
							}
						}
						edited = 1;
						map_mesh = meshMAP(map);
						mainScreen.add(map_mesh.mesh);
						if(show_edge() == "Show") mainScreen.add(map_mesh.edge);
					}
				}
			}
		}else if(mouse.status == 1 && mouse.button == 0 && pen.mode == "brush_face"){
			if((hitCheck == 0 || hitIndex != phitIndex) && hitPos.length > 0 && hitObj == editingObject){
				if(hitPos[0].object.geometry.type == "BufferGeometry"){
					if(map[editingObject][hitIndex].color != pen.color){
						hitCheck = 1;
						mainScreen.delete(map_mesh.mesh);
						mainScreen.delete(map_mesh.edge);
						map[editingObject][hitIndex][hitFace] = pen.color;
						edited = 1;
						map_mesh = meshMAP(map);
						mainScreen.add(map_mesh.mesh);
						if(show_edge() == "Show") mainScreen.add(map_mesh.edge);
					}
				}
			}
		}else if(mouse.status == 1 && ((mouse.button == 0 && pen.mode == "eraser") || mouse.button == 2)){
			if(hitCheck == 0 && hitPos.length > 0){
				hitCheck = 1;
				if(hitPos[0].object.geometry.type == "BufferGeometry"  && hitObj == editingObject){
					mainScreen.delete(map_mesh.mesh);
					mainScreen.delete(map_mesh.edge);
					delete map[editingObject][hitIndex];
					edited = 1;
					map_mesh = meshMAP(map);
					mainScreen.add(map_mesh.mesh);
					if(show_edge() == "Show") mainScreen.add(map_mesh.edge);
				}else{
					mainScreen.delete(temp[hitIndex]);
					delete temp[hitIndex];
				}
			}
		}else if(mouse.status == 1 && mouse.button == 0 && pen.mode == "eraser(beam)"){
			if((hitCheck == 0 || placeIndex != phitIndex) && hitPos.length > 0 && hitObj == editingObject){
				hitCheck = 1;
				if(hitPos[0].object.geometry.type == "BufferGeometry"){
					mainScreen.delete(map_mesh.mesh);
					mainScreen.delete(map_mesh.edge);
					delete map[editingObject][hitIndex];
					edited = 1;
					map_mesh = meshMAP(map);
					mainScreen.add(map_mesh.mesh);
					if(show_edge() == "Show") mainScreen.add(map_mesh.edge);
				}else{
					mainScreen.delete(temp[hitIndex]);
					delete temp[hitIndex];
				}
			}
		}else if(mouse.status == 1 && mouse.button == 0 && pen.mode == "fill"){
			if(hitCheck == 0){
				hitCheck = 1;
				if(Fill.p1.set == 0){
					for(const i in Fill.p1){
						Fill.p1[i] = grid.place[i];
					}
					Fill.p1.set = 1;
					temp[placeIndex] = (new Three.Mesh(tempGeometry,tempMaterial));
					temp[placeIndex].position.set(grid.place.x+0.5, grid.place.y+0.5, grid.place.z+0.5);
					mainScreen.add(temp[placeIndex]);
				}else if(Fill.p2.set == 0){
					for(const TEMP in temp){
						mainScreen.delete(temp[TEMP]);
						delete temp[TEMP];
					}
					temp = {};
					for(const i in Fill.p2){
						Fill.p2[i] = grid.place[i];
					}
					Fill.p2.set = 1;
					mainScreen.delete(map_mesh.mesh);
					mainScreen.delete(map_mesh.edge);
					for(let x = Math.min(Fill.p1.x, Fill.p2.x); x <= Math.max(Fill.p1.x, Fill.p2.x); x++){
						for(let y = Math.min(Fill.p1.y, Fill.p2.y); y <= Math.max(Fill.p1.y, Fill.p2.y); y++){
							for(let z = Math.min(Fill.p1.z, Fill.p2.z); z <= Math.max(Fill.p1.z, Fill.p2.z); z++){
								if(NotInMap("(" + x +"," + y + ","+ z + ")", map) && ((x-Fill.p1.x)*(x-Fill.p2.x)*(y-Fill.p1.y)*(y-Fill.p2.y)*(z-Fill.p1.z)*(z-Fill.p2.z) == 0)){
									map[editingObject]["(" + x +"," + y + ","+ z + ")"] = {pos:{x:x, y:y, z:z}, color:pen.color};
								}
							}
						}
					}
					edited = 1;
					map_mesh = meshMAP(map);
					mainScreen.add(map_mesh.mesh);
					if(show_edge() == "Show") mainScreen.add(map_mesh.edge);
					Fill = {p1:{x:0,y:0,z:0,set:0},p2:{x:0,y:0,z:0,set:0}};
				}
			}
		}else{
			if(pen.mode != "fill" && Fill.p1.set != 0){
				Fill = {p1:{x:0,y:0,z:0,set:0},p2:{x:0,y:0,z:0,set:0}};
				for(const TEMP in temp){
					mainScreen.delete(temp[TEMP]);
					delete temp[TEMP];
				}
				temp = {};
			}
			if(hitCheck == 1 && pen.mode == "anchor"){
				pen.update();
			}
			hitCheck = 0;
			pen.lastPut = undefined;
			if(edited == 1){
				Preview.update(map);
				Preview.doMarge();
				if(histIndex == undefined){
					histIndex = editHistory.length-1;
				}
				histIndex++;
				editHistory.splice(histIndex);
				editHistory.push(JSON.stringify(map));
				edited = 0;
			}
			if(z.status == 1 || Z.status == 1){
				if(undo_check == 0){
					if(ctrl.status == 1){
						edited = 0;
						undo_check = 1;
						if(histIndex == undefined){
							histIndex = editHistory.length-1;
						}
						if(shft.status == 1){
							if(histIndex < editHistory.length-1){
								histIndex++;
							}
						}else{
							if(histIndex > 0){
								histIndex--;
							}
						}
						for(const TEMP in temp){
							mainScreen.delete(temp[TEMP]);
							delete temp[TEMP];
						}
						temp = {};
						mainScreen.delete(map_mesh.mesh);
						mainScreen.delete(map_mesh.edge);
						if(histIndex == 0){
							map = {};
						}else{
							map = JSON.parse(editHistory[histIndex]);
						}
						map_mesh = meshMAP(map);
						mainScreen.add(map_mesh.mesh);
						if(show_edge() == "Show") mainScreen.add(map_mesh.edge);
						Preview.update(map);
					}
				}
			}else{
				undo_check = 0;
			}
		}
		pplaceIndex = placeIndex;
		phitIndex = hitIndex;
	}
	mainCam.x+=rot.H*cos+rot.V*siny*sin;
	mainCam.z+=-rot.H*sin+rot.V*siny*cos;
	mainCam.y+= rot.V*cosy;
	mainCam.x-=mainCam.tx;
	mainCam.y-=mainCam.ty;
	mainCam.z-=mainCam.tz;
	mainCam.r = Math.sqrt(1200)/Math.sqrt(mainCam.x**2+mainCam.y**2+mainCam.z**2);
	mainCam.x*=mainCam.r;
	mainCam.y*=mainCam.r;
	mainCam.z*=mainCam.r;
	mainCam.x+=mainCam.tx;
	mainCam.y+=mainCam.ty;
	mainCam.z+=mainCam.tz;
	mainScreen.setCamera(mainCam);
	mainCam.x-=mainCam.tx;
	mainCam.y-=mainCam.ty;
	mainCam.z-=mainCam.tz;
	let tempt = {x:mainCam.tx, y:mainCam.ty, z:mainCam.tz}
	mainCam.tx = 0;
	mainCam.ty = 0;
	mainCam.tz = 0;
	axisScreen.setCamera(mainCam);
	mainCam.tx = tempt.x;
	mainCam.ty = tempt.y;
	mainCam.tz = tempt.z;
	mainCam.x+=mainCam.tx;
	mainCam.y+=mainCam.ty;
	mainCam.z+=mainCam.tz;
	mainScreen.render();
	axisScreen.render();
}