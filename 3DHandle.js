import * as Three from "three/webgpu";
import * as bufferGeometruUtils from "three/addons/utils/BufferGeometryUtils.js";

export class renderer{
	constructor(animation = undefined, canvasId = "canvas", canvasOpt = undefined, resolution = 1, backgroundColor = 0x7f7f7f){
		this.canvas = document.getElementById(canvasId);
		if(canvasOpt != undefined){
			this.canvas.width = canvasOpt.width;
			this.canvas.height = canvasOpt.height;
		}
		this.renderer = new Three.WebGPURenderer({canvas:this.canvas, alpha:true});
		this.renderer.setSize(this.canvas.width,this.canvas.height);
		this.renderer.outputColorSpace = Three.SRGBColorSpace;
		this.resolution = resolution;
		this.renderer.setPixelRatio(resolution);
		this.scene = new Three.Scene();
		this.scene.background = new Three.Color(backgroundColor);
		if(animation != undefined){
			this.renderer.setAnimationLoop(animation);
		}
		this.camera = {};
		this.cameraOpt = {};
		this.raycaster = new Three.Raycaster();
		this.aspect = this.canvas.width/this.canvas.height;
	}
	transparent(){
		this.scene.background = null;
	}
	addCamera(name = "camera", Camera){
		this.camera[name] = new Three.OrthographicCamera(-Camera.range/2, Camera.range/2, Camera.range/2/this.aspect, -Camera.range/2/this.aspect, 0.1, 200);
		this.cameraOpt[name] = Camera.opt;
		this.camera[name].position.set(this.cameraOpt[name].x, this.cameraOpt[name].y, this.cameraOpt[name].z);
		this.camera[name].lookAt(new Three.Vector3(this.cameraOpt[name].tx, this.cameraOpt[name].ty, this.cameraOpt[name].tz));
  	}
	render(name = Object.keys(this.camera)[0]){
		this.renderer.render(this.scene, this.camera[name]);
	}
	add(mesh){
		this.scene.add(mesh);
	}
	delete(mesh){
		this.scene.remove(mesh)
	}
	setResolution(resolution){
		this.renderer.setPixelRatio(resolution);
	}
	castRay(screenPos, name = Object.keys(this.camera)[0]){
		this.raycaster.far = 1000;
		let npos = {x:2*screenPos.x*this.resolution/this.canvas.width-1, y:-2*screenPos.y*this.resolution/this.canvas.height+1};
		this.raycaster.setFromCamera(npos, this.camera[name]);
		return this.raycaster.intersectObjects(this.scene.children).filter(hit => !(hit.object instanceof Three.GridHelper || hit.object instanceof Three.LineSegments));
	}
	sceneSize(width, height, name = Object.keys(this.camera)[0]){
		this.renderer.setSize(width, height);
		this.aspect = width/height;
		this.setCamera(this.cameraOpt[name]);
	}
	setCamera(option, name = Object.keys(this.camera)[0]){
		this.cameraOpt[name] = option;
		this.camera[name].left = this.cameraOpt[name].cx-this.cameraOpt[name].range/2;
		this.camera[name].right = this.cameraOpt[name].cx+this.cameraOpt[name].range/2;
		this.camera[name].top = this.cameraOpt[name].cy+this.cameraOpt[name].range/2/this.aspect;
		this.camera[name].buttom = this.cameraOpt[name].cy-this.cameraOpt[name].range/2/this.aspect;
		this.camera[name].zoom = this.cameraOpt[name].zoom;
		this.camera[name].position.set(this.cameraOpt[name].x, this.cameraOpt[name].y, this.cameraOpt[name].z);
		this.camera[name].lookAt(new Three.Vector3(this.cameraOpt[name].tx, this.cameraOpt[name].ty, this.cameraOpt[name].tz));
		this.camera[name].updateProjectionMatrix();
	}
}