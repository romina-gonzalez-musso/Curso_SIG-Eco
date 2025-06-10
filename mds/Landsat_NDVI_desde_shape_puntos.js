/// ---------------- CURSO SIG EN ECOLOGIA 2025 ------------------- //////
///              SERIE TEMPORAL NDVI DE LANDSAT 8 y 9
///            EXTRAER NDVI A PARTIR DE ASSET DE PUNTOS
/// -------------------------------------------------------------- //////


// --------- CONFIGURACIÓN INICIAL -------------------------------------

// Cargar shapefile de puntos (Asset propio del estudiante)
var points = ee.FeatureCollection("projects/ee-gonzalezmusso-romina/assets/points_test");

// Definir periodo de tiempo
var fechaInicio = '2015-01-01';
var fechaFin = '2025-01-01';

var cloudCover = 20

// --------- FUNCIONES PARA LAS IMAGENES DE LANDSAT -------------------------------------

// Filtro de nubes actualizado a Collection 2
function maskLandsatSR(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 1).eq(0)  // dilated cloud
              .and(qa.bitwiseAnd(1 << 2).eq(0))  // cirrus
              .and(qa.bitwiseAnd(1 << 3).eq(0))  // cloud
              .and(qa.bitwiseAnd(1 << 4).eq(0)); // shadow
  return image.updateMask(mask);
}

// Aplicar factores de escalado
function applyScaleFactors(image) {
  var optical = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermal = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(optical, null, true)
              .addBands(thermal, null, true);
}

// Calcular NDVI
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  return image.addBands(ndvi);
}

// --------- PROCESAR LAS COLECCIONES -------------------------------------

var L9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(points)
  .filter(ee.Filter.lt('CLOUD_COVER', cloudCover))
  .map(maskLandsatSR)
  .map(applyScaleFactors)
  .map(addNDVI)
  .map(function(image) {
    return image.set('SATELLITE', 'LANDSAT_9');
  });

var L8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2') 
  .filterBounds(points)
  .filter(ee.Filter.lt('CLOUD_COVER', cloudCover))
  .map(maskLandsatSR)
  .map(applyScaleFactors)
  .map(addNDVI)
  .map(function(image) {
    return image.set('SATELLITE', 'LANDSAT_8');
  });

// Combinar las colecciones
var LandsatColl = L8.merge(L9)
  .filterDate(fechaInicio, fechaFin);
  

// SERIE TEMPORAL PARA CADA PUNTO -----------------------------------------------
var extractNDVI = function(feature) {
  var point = feature.geometry();
  var ndviSeries = LandsatColl.map(function(image) {
    var ndvi = image.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: point,
      scale: 30
    }).get('NDVI');
    
    // Crear el nuevo feature con atributos adicionales
    return ee.Feature(point)
      .copyProperties(feature)  // Copia todos los atributos del shapefile original
      .set({
        'date': image.date().format('YYYY-MM-dd'),
        'ndvi': ndvi,
        'satellite': image.get('SATELLITE')
      });
  });
  return ndviSeries;
};

// Unir todos los valores en una sola tabla
var ndviCollection = points.map(extractNDVI).flatten();

// --------- EXPORTAR A CSV -------------------------

// Mostrar una muestra del resultado antes de exportar
print('Ejemplo de tabla a exportar:', ndviCollection.limit(5));


Export.table.toDrive({
  collection: ndviCollection,
  description: 'NDVI_L8_L9_por_puntos',
  fileFormat: 'CSV', 
  folder: 'GEE_export'
});


// --------- VISUALIZACIÓN EJEMPLO -------------------------

// Definir una fecha objetivo
var fechaObjetivo = ee.Date('2021-01-15');

// Buscar la imagen más cercana a esa fecha (±15 días)
var imagenNDVI = LandsatColl
  .filterDate(fechaObjetivo.advance(-15, 'day'), fechaObjetivo.advance(15, 'day'))
  .sort('system:time_start')
  .first()
  .select('NDVI');

// Parámetros de visualización NDVI
var visNDVI = {
  min: -0.2,
  max: 0.9,
  palette: ['blue', 'white', 'green']
};

// Mostrar en el mapa
Map.centerObject(points, 10);
Map.addLayer(imagenNDVI, visNDVI, 'NDVI ~ 15-01-2021');
Map.addLayer(points, {color: 'red'}, 'Puntos');

