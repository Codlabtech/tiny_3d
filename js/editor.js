

var container, stats, output;
var camera, scene, renderer;
var splineHelperObjects = [];
var splineOutline;
var splinePointsLength = 4;
var positions = [];
var options;


var ARC_SEGMENTS = 200;
var splineMesh;

var splines = {

};

var CUBE = 0;
var TRIANGULAR_PRISM = 1;
var TRIANGULAR_PRISM_LEFT = 2;
var TRIANGULAR_PRISM_RIGHT = 3;
var shapes = [];


function getCube(){
  return CUBE;
}

function getTriangularPrism(){
  return TRIANGULAR_PRISM;
}

function getTriangularPrismLeft(){
  return TRIANGULAR_PRISM_LEFT;
}

function getTriangularPrismRight(){
  return TRIANGULAR_PRISM_RIGHT;
}

function load(){
  for(var k in shapes){
    addSplineObject(shapes[k]);
  }
}

function editor_init(reference_shapes, container, output) {
  shapes = reference_shapes;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.z = 1000;
  camera.position.y = 200;
  scene.add( camera );

  scene.add( new THREE.AmbientLight( 0xf0f0f0 ) );
  var light = new THREE.SpotLight( 0xffffff, 1.5 );
  light.position.set( 0, 1500, 200 );
  light.castShadow = true;
  light.shadow = new THREE.LightShadow( new THREE.PerspectiveCamera( 70, 1, 200, 2000 ) );
  light.shadow.bias = -0.000222;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  scene.add( light );
  spotlight = light;

  // scene.add( new THREE.CameraHelper( light.shadow.camera ) );

  var planeGeometry = new THREE.PlaneGeometry( 2000, 2000 );
  planeGeometry.rotateX( - Math.PI / 2 );
  var planeMaterial = new THREE.ShadowMaterial();
  planeMaterial.opacity = 0.2;

  var plane = new THREE.Mesh( planeGeometry, planeMaterial );
  plane.position.y = 0;
  plane.receiveShadow = true;
  scene.add( plane );

  var helper = new THREE.GridHelper( 1000, 100 );
  helper.position.y = 0;
  helper.material.opacity = 0.25;
  helper.material.transparent = true;
  scene.add( helper );

  var axis = new THREE.AxisHelper();
  axis.position.set( -500, -500, -500 );
  scene.add( axis );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setClearColor( 0xf0f0f0 );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize(200, 200);
  renderer.shadowMap.enabled = true;
  container.append( renderer.domElement);

  stats = new Stats();
  output.append( stats.dom );

  // Controls
  controls = new THREE.OrbitControls( camera, renderer.domElement );
  controls.damping = 0.2;
  controls.addEventListener( 'change', render );

  transformControl = new THREE.TransformControls( camera, renderer.domElement );
  transformControl.addEventListener( 'change', render );

  scene.add( transformControl );

  transformControl.addEventListener( 'change', function( e ) {
    cancelHideTransorm();
  } );

  transformControl.addEventListener( 'mouseDown', function( e ) {
    cancelHideTransorm();

  } );

  transformControl.addEventListener( 'mouseUp', function( e ) {
    delayHideTransform();
  } );

  var dragcontrols = new THREE.DragControls( camera, splineHelperObjects, renderer.domElement ); //

  var __hover = undefined;

  var mouse = {x:0, y:0};
  var projector = new THREE.Projector();
  document.getElementById("container").addEventListener( 'mousedown',
  function ( event ) {
    var eventX = event.clientX - container.offset().left;
    var eventY = event.clientY - container.offset().top;

    mouse.x = ( eventX / getSceneWidth() ) * 2 - 1;
    mouse.y = - ( eventY / getSceneHeight()) * 2 + 1;

    var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
    projector.unprojectVector( vector, camera );
    var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );

    var intersects = ray.intersectObjects( splineHelperObjects);//targetList );

    if ( intersects.length > 0 ){
      intersects[ 0 ].face.color.setRGB( 0.8 * Math.random() + 0.2, 0, 0 );
      intersects[ 0 ].object.geometry.colorsNeedUpdate = true;

      cancelHideTransorm();
      var object = intersects[ 0 ].object;
      transformControl.attach(intersects[ 0 ].object);
      $("#shape").css("display","block");
      $("#width").val(object.scale.x);
      $("#height").val(object.scale.y);
      $("#depth").val(object.scale.z);
    }else{
      $("#shape").css("display","none");
      if(transformControl.object)
      transformControl.detach(transformControl.object);
    }

  }, false );

  window.addEventListener( 'keydown', function ( event ) {
    if(!transformControl.object){
      return;
    }
    switch ( event.keyCode ) {
      case 81: // Q
      transformControl.setSpace( transformControl.space === "local" ? "world" : "local" );
      break;
      case 17: // Ctrl
      transformControl.setTranslationSnap( 100 );
      transformControl.setRotationSnap( THREE.Math.degToRad( 15 ) );
      break;
      case 84: // W
      transformControl.setMode( "translate" );
      break;
      case 82: // E
      transformControl.setMode( "rotate" );
      break;
    }
  });


  dragcontrols.on( 'hoveron', function( e ) {
  } )

  dragcontrols.on( 'hoveroff', function( e ) {
  } )


  controls.addEventListener( 'start', function() {
  } );

  controls.addEventListener( 'end', function() {
  } );

  var hiding;

  function delayHideTransform() {
    cancelHideTransorm();
    hideTransform();
  }

  function hideTransform() {
    hiding = setTimeout( function() {
      transformControl.detach( transformControl.object );
    }, 2500 )
  }

  function cancelHideTransorm() {
    if ( hiding ) clearTimeout( hiding );
  }

  load();

  return {
    transform_controller: transformControl
  }
}


function changeCurrentSelectedTo(type){
  var object = transformControl.object;

  if(object){
    var description = object.description;
    description.type = type;

    removeObject(object);
    transformControl.update();
    addSplineObject(description);
    $("#shape").css("display","none");
  }
}

function addSplineObject( shape ) {
  var object = createGeometryFromShape(shape);
  scene.add( object );
  splineHelperObjects.push( object );
  return object;
}

function addPoint() {
  splinePointsLength ++;
  var shape = createDefaultShape();
  var object = addSplineObject(shape);
  positions.push(object);
  shapes.push(shape);
}

function removePoint() {
  if ( splinePointsLength <= 4 ) {
    return;
  }
  splinePointsLength --;
  positions.pop();
  var object = splineHelperObjects.pop();
  if(object.description){

  }
  scene.remove(object);
}

function removeObject(object){
  var index = splineHelperObjects.indexOf(object);
  if (index > -1) {
    splineHelperObjects.splice(index, 1);
    transformControl.detach(object);
    scene.remove(object);
  }
}

function exportSpline() {
  var p;
  var strplace = [];
  for ( i = 0; i < splinePointsLength; i ++ ) {
    p = splineHelperObjects[ i ].position;
    strplace.push( 'new THREE.Vector3({0}, {1}, {2})'.format( p.x, p.y, p.z ) )
  }
  console.log( strplace.join( ',\n' ) );
  var code = '[' + ( strplace.join( ',\n\t' ) ) + ']';
  prompt( 'copy and paste code', code );
}


function animate() {
  requestAnimationFrame( animate );
  render();
  stats.update();
  controls.update();
  transformControl.update();

  if(transformControl.object){
    var object = transformControl.object;
    var description = object.description;
    description.rx = object.quaternion._x;
    description.ry = object.quaternion._y;
    description.rz = object.quaternion._z;
    description.x = object.position.x;
    description.z = object.position.z;

    var y = object.position.y;
    y -= object.scale.y/2;
    $("#current_y").html(y);

    description.y = y;
  }
}

function render() {
  renderer.render( scene, camera );
}

function createGeometryFromShape(shape){
  var geometry = undefined;
  var material = undefined;
  var object = undefined;
  shape.type = parseInt(shape.type, 10);
  switch(shape.type){
    case TRIANGULAR_PRISM:
    console.log("create triangular");
    var A = new THREE.Vector2( -0.5, -0.5 );
    var B = new THREE.Vector2( 0, 0.5 );
    var C = new THREE.Vector2( 0.5, -0.5 );
    var depth = 1;
    geometry = new PrismGeometry( [ A, B, C ], depth );
    geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, 0, -0.5 ) );
    material = new THREE.MeshLambertMaterial({
      color: Math.random() * 0xffffff
    });
    object = new THREE.Mesh( geometry, material);
    break;

    case TRIANGULAR_PRISM_LEFT:
    console.log("create triangular left");
    var A = new THREE.Vector2( -0.5, -0.5 );
    var B = new THREE.Vector2( 0.5, -0.5 );
    var C = new THREE.Vector2( -0.5, 0.5 );
    var depth = 1;
    geometry = new PrismGeometry( [ A, B, C ], depth );
    geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, 0, -0.5 ) );
    material = new THREE.MeshLambertMaterial({
      color: Math.random() * 0xffffff
    });
    object = new THREE.Mesh( geometry, material);
    break;

    case TRIANGULAR_PRISM_RIGHT:
    console.log("create triangular right");
    var A = new THREE.Vector2( -0.5, -0.5 );
    var B = new THREE.Vector2( 0.5, -0.5 );
    var C = new THREE.Vector2( 0.5, 0.5 );
    var depth = 1;
    geometry = new PrismGeometry( [ A, B, C ], depth );
    geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, 0, -0.5 ) );
    material = new THREE.MeshLambertMaterial({
      color: Math.random() * 0xffffff
    });
    object = new THREE.Mesh( geometry, material);
    break;

    case CUBE:
    default:
    console.log("create default "+shape.type);
    geometry = new THREE.BoxGeometry(1,1,1);
    material = new THREE.MeshLambertMaterial({
      color: Math.random() * 0xffffff
    });
    object = new THREE.Mesh( geometry, material);
  }

  object.scale.x = shape.width;
  object.scale.y = shape.height;
  object.scale.z = shape.depth;
  object.material.ambient = object.material.color;
  object.castShadow = true;
  object.receiveShadow = true;

  object.position.x = shape.x;
  object.position.y = shape.y;
  object.position.z = shape.z;

  object.rotateX(shape.rx);
  object.rotateY(shape.ry);
  object.rotateZ(shape.rz);

  setY(object, shape.y);

  object.description = shape;
  shape.object = object;

  return object;
}


function forceSetY(transformation_controller){
  var y = $("#y").val();
  if(transformation_controller.object){
    setY(transformation_controller.object, y);
  }
}

function createDefaultShape(){
  return {
    x: Math.random()*100,
    y: Math.random()*100,
    z: Math.random()*100,
    width: 100,
    height:100,
    depth:100,
    rx:0,
    ry:0,
    rz:0,
    type: CUBE
  };
}

function setY(object, new_y){
  var last_position = object.position.y;
  if(isNumeric(new_y))
  object.position.y = parseInt(new_y) + object.scale.y/2;
}

function isNumeric(obj) {
  return !jQuery.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;
}

function getSceneWidth(){
  return  window.innerWidth * 8 / 12;
}

function getSceneHeight(){
  return 400;
}
