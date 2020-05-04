var Camara;
var BotonesEntrenar;
var knn;
var modelo;
var Texto;
var Clasificando = false;
var InputTexbox;
var BotonTexBox;

let BrokerMQTT = 'broker.shiftr.io';
let PuertoMQTT = 80;
let ClienteIDMQTT = "MQTT-P5";
let UsuarioMQTT = "carlosguaillazaca";
let ContrasenaMQTT = "nomeacuerdo2402";

client = new Paho.MQTT.Client(BrokerMQTT, PuertoMQTT, ClienteIDMQTT);

// set callback handlers
client.onConnectionLost = MQTTPerder;
client.onMessageArrived = MQTTMensaje;

client.connect({
  onSuccess: CuandoConectadoMQTT,
  userName: UsuarioMQTT,
  password: ContrasenaMQTT
});

function MQTTPerder(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("MQTT Perdio coneccion Error:" + responseObject.errorMessage);
  }
}

function MQTTMensaje(message) {
  console.log("Mensaje recibido:" + message.payloadString);
}

function CuandoConectadoMQTT() {
  console.log("MQTT Conectado");
}

function setup() {

  var canvas=createCanvas(320, 240);
  var x=(windowWidth-width+200)/2;
  var y=(windowHeight -height+300)/2;
  canvas.position(x,y);
  background(0, 0, 0);
  Camara = createCapture(VIDEO);
  Camara.size(320, 240);
  Camara.hide();

  modelo = ml5.featureExtractor('MobileNet', ModeloListo);
  knn = ml5.KNNClassifier();

  h1=createElement('h1','Presiona Botones para entrenar');
  h1.position(40,280);
  h1.style('color:blue');

  var Boton1 = createButton("Producto Bueno");
  Boton1.class("BotonEntrenar");
  Boton1.position(150,350);

  var Boton2 = createButton("Producto Regular");
  Boton2.class("BotonEntrenar");
  Boton2.position(150,400);

  var Boton3 = createButton("Producto Malo");
  Boton3.class("BotonEntrenar");
  Boton3.position(150,450);

  var BotonNada = createButton("Fondo");
  BotonNada.class("BotonEntrenar");
  BotonNada.position(180,500);

  aviso0 = createP('Configura y entrena el Fondo')
  aviso0.position(250,500);

  aviso1=createElement('h1',"Entrena usando Nuevo Parametro")
  aviso1.position(40,550);
  aviso1.style('color:blue');

  aviso2 = createP('Ingresa un nuevo parametro si es necesario')
  aviso2.position(50,600);

  aviso3 = createP('Escribe el nombre del nuevo producto en el cuadro de texto')
  aviso3.position(50,620);

  InputTexbox = createInput("Nuevo Parametro");
  InputTexbox.position(60,670);

  BotonTexBox = createButton("Entrenar con " + InputTexbox.value())
  BotonTexBox.mousePressed(EntrenarTexBox);
  BotonTexBox.position(250,670);

  aviso4=createP("Generar o Cargar DataSet");
  aviso4.position(125,720);

  aviso5=createP("Es importante no cambiar el nombre del DataSet");
  aviso5.position(80,820);
  aviso5=createP("Modelo.js, Ordenar en carpetas segun sea el caso");
  aviso5.position(80,840);

  var BotonGuardar = createButton("Guardar");
  BotonGuardar.mousePressed(GuardadNeurona);
  BotonGuardar.position(150,770);
  var BotonCargar = createButton("Cargar");
  BotonCargar.mousePressed(CargarNeurona);
  BotonCargar.position(250,770);

  Texto = createP("Modelo no Listo, esperando");
  Texto.position(900,400);

  BotonesEntrenar = selectAll(".BotonEntrenar");

  for (var B = 0; B < BotonesEntrenar.length; B++) {
    BotonesEntrenar[B].style("margin", "5px");
    BotonesEntrenar[B].style("padding", "6px");
    BotonesEntrenar[B].mousePressed(PresionandoBoton);
  }
}

function PresionandoBoton() {
  var NombreBoton = this.elt.innerHTML;
  console.log("Entrenando con " + NombreBoton);
  EntrenarKnn(NombreBoton);
}

function EntrenarKnn(ObjetoEntrenar) {
  const Imagen = modelo.infer(Camara);
  knn.addExample(Imagen, ObjetoEntrenar);
}

function ModeloListo() {
  console.log("Modelo Listo");
  Texto.html("Modelo Listo");
  Texto.position(900,500);

}

function clasificar() {
  const Imagen = modelo.infer(Camara);
  knn.classify(Imagen, function(error, result) {
    if (error) {
      console.error();
    } else {
      Texto.html("Es un " + result.label); // aqui escribe el resultado de lo q entreno
      message = new Paho.MQTT.Message(result.label);// ponemos aqui
      message.destinationName = "tesis/Clasificar";
      client.send(message);
      //clasificar();
    }
  })
}

function EntrenarTexBox() {
  const Imagen = modelo.infer(Camara);
  knn.addExample(Imagen, InputTexbox.value());
}

function GuardadNeurona() {
  if (Clasificando) {
    save(knn, "modelo.json");
  }
}

function CargarNeurona() {
  console.log("Cargando una Neurona");
  knn.load("./modelo.json", function() {
    console.log("Neurona Cargada knn");
    Texto.html("Neurona cargana de archivo");
  })
}

function draw() {
  image(Camara, 0, 0, 320, 240);
  BotonTexBox.html("Entrenar con " + InputTexbox.value());
  if (knn.getNumLabels() > 0 && !Clasificando) {
    //clasificar();
    setInterval(clasificar, 500);
    Clasificando = true;
  }
}

// Temporary save code until ml5 version 0.2.2
const save = (knn, name) => {
  const dataset = knn.knnClassifier.getClassifierDataset();
  if (knn.mapStringToIndex.length > 0) {
    Object.keys(dataset).forEach(key => {
      if (knn.mapStringToIndex[key]) {
        dataset[key].label = knn.mapStringToIndex[key];
      }
    });
  }
  const tensors = Object.keys(dataset).map(key => {
    const t = dataset[key];
    if (t) {
      return t.dataSync();
    }
    return null;
  });
  let fileName = 'myKNN.json';
  if (name) {
    fileName = name.endsWith('.json') ? name : `${name}.json`;
  }
  saveFile(fileName, JSON.stringify({
    dataset,
    tensors
  }));
};

const saveFile = (name, data) => {
  const downloadElt = document.createElement('a');
  const blob = new Blob([data], {
    type: 'octet/stream'
  });
  const url = URL.createObjectURL(blob);
  downloadElt.setAttribute('href', url);
  downloadElt.setAttribute('download', name);
  downloadElt.style.display = 'none';
  document.body.appendChild(downloadElt);
  downloadElt.click();
  document.body.removeChild(downloadElt);
  URL.revokeObjectURL(url);
};
