/// ---------- CURSO SIG EN ECOLOGIA 2026 -------------------- //////
///       CLASIFICACION RANDOM FOREST SENCILLA  
///             3 CLASES DE COBERTURA
/// --------------------------------------------------------- //////

// Clases: 1=Cultivo  2=Arbolado  3=Agua

// Notas Romi
// - Cargar los puntos train como asset
// - Elegir algunas variables de predicción (NDVI verano, invierno, EVI, NDWI)
// - Extraer valores espectrales en cada punto con sampleRegions()
// - Entrenar el modelo (80% de los puntos)  
// - Clasificar toda la imagen                  
// - Evaluar con el 20% restante    
// - Nombre del campo de clase "cobertura"

// Centrar mapa
Map.centerObject(geometry, 8);
 
 
// Rangos temporales ----------------------------------------------------
var summerStart = '2025-11-01';  var summerEnd = '2025-12-31';
var winterStart = '2025-06-01';  var winterEnd = '2025-07-31';
 
// Preprocesamiento -------------------------------------------------------
function cloudMask(image) {
  var qa = image.select('QA_PIXEL');
  return image.updateMask(
    qa.bitwiseAnd(1 << 3).or(qa.bitwiseAnd(1 << 4)).not());
}
function applyScaleFactors(image) {
  return image.addBands(
    image.select('SR_B.').multiply(0.0000275).add(-0.2), null, true);
}
function addIndices(image) {
  var nir  = image.select('SR_B5');
  var red  = image.select('SR_B4');
  var blue = image.select('SR_B2');
  var ndvi  = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  var evi   = nir.subtract(red).multiply(2.5)
                .divide(nir.add(red.multiply(6))
                .subtract(blue.multiply(7.5)).add(1)).rename('EVI');
  var mndwi = image.normalizedDifference(['SR_B3', 'SR_B6']).rename('MNDWI');
  return image.addBands([ndvi, evi, mndwi]);
}
 
var bands = ['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','QA_PIXEL'];
 
function procesarColeccion(id, start, end) {
  return ee.ImageCollection(id)
    .select(bands).filterBounds(geometry).filterDate(start, end)
    .filter(ee.Filter.lt('CLOUD_COVER', 20))
    .map(cloudMask).map(applyScaleFactors).map(addIndices);
}
 

// COMPUESTOS ESTACIONALES ------------------------
// Verano:
var summer = procesarColeccion('LANDSAT/LC08/C02/T1_L2', summerStart, summerEnd)
  .merge(procesarColeccion('LANDSAT/LC09/C02/T1_L2', summerStart, summerEnd))
  .qualityMosaic('NDVI')
  .clip(geometry);
 
// Invierno:
var winter = procesarColeccion('LANDSAT/LC08/C02/T1_L2', winterStart, winterEnd)
  .merge(procesarColeccion('LANDSAT/LC09/C02/T1_L2', winterStart, winterEnd))
  .median()
  .clip(geometry);
 

// PREDICTORES
var p = ['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','NDVI','EVI','MNDWI'];
 
var composite = summer.select(p).rename(p.map(function(b){ return b+'_V'; }))
  .addBands(winter.select(p).rename(p.map(function(b){ return b+'_I'; })));
 
var predictores = composite.bandNames();
print('Predictores:', predictores);
 
// PUNTOS de training
var puntos = puntos
var campoClase = 'cobertura';
 
// Extraer valores espectrales en cada punto ------------------------------
var muestras = composite.sampleRegions({
  collection: puntos,
  properties: [campoClase],
  scale: 30,
  tileScale: 4
});
 
// Dividir 80% entrenamiento / 20% validacion -----------------------------
var split = muestras.randomColumn('random', 42);
var entrenamiento = split.filter(ee.Filter.lt('random', 0.8));
var validacion    = split.filter(ee.Filter.gte('random', 0.8));
 
print('Entrenamiento:', entrenamiento.size());
print('Validacion:', validacion.size());
 
// ENTRENAR RANDOM FOREST
var modelo = ee.Classifier.smileRandomForest({
  numberOfTrees: 100,
  seed: 42
}).train({
  features: entrenamiento,
  classProperty: campoClase,
  inputProperties: predictores
});
 
// CLASIFICAR
var clasificacion = composite.classify(modelo).clip(geometry);
 
// EVALUAR
var matrizConf = validacion.classify(modelo)
  .errorMatrix(campoClase, 'classification');
 
//print('Matriz de confusion:',  matrizConf);
print('Overall Accuracy:',     matrizConf.accuracy());
print('Kappa:',                matrizConf.kappa());
//print('Producer Accuracy:',    matrizConf.producersAccuracy());
//print('Consumer Accuracy:',    matrizConf.consumersAccuracy());
 

// VISUALIZACION
var visClas = {
  min: 1, max: 3,
  palette: ['c8d44e',  // 1 - Cultivo
            '2d6a2d',  // 2 - Arbolado
            '1a6faf']  // 3 - Agua
};
 
Map.addLayer(winter, {bands:['SR_B4','SR_B3','SR_B2'], min:0, max:0.2},
             'RGB Invierno', false);
Map.addLayer(summer, {bands:['SR_B4','SR_B3','SR_B2'], min:0, max:0.2},
             'RGB Verano', false);
Map.addLayer(puntos, {color: 'red'}, 'Puntos de entrenamiento');
Map.addLayer(clasificacion, visClas, 'Clasificacion RF');
 
// Exportar ---------------------------------------------------------------
Export.image.toDrive({
  image: clasificacion,
  description: 'Landsat89_RF_Clasificacion',
  scale: 30,
  crs: 'EPSG:4326',
  folder: 'GEE_export',
  maxPixels: 1e10
});
 
