/// -------------------- CURSO SIG EN ECOLOGIA 2026 ------------------
///         LANDSAT SURFACE TEMPERATURE - SERIE TIEMPO PUNTOS
/// ------------------------------------------------------------------

// TRAER LOS PUNTOS O UN SHAPE ----------------------------------------------------

// Ejemplo con dos puntos
var points = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([-71.333789, -39.872795]), {name: 'Point 1'}),
  ee.Feature(ee.Geometry.Point([-71.237333, -39.829996]), {name: 'Point 2'})
]);

// FECHAS -------------------------------------------------------------------------
var startDate = '2023-06-01';
var endDate = '2023-06-21';

// MASCARAS Y ESCALADO ------------------------------------------------------------
function cloudMask(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3)
    .or(qa.bitwiseAnd(1 << 4));
  return image.updateMask(mask.not());
}

function applyScaleFactors(image) {
  var thermalBands = image.select('ST_B10').multiply(0.00341802).add(149.0) 
  .subtract(273.15); // De Kelvin a Grados Celsius
  return image.addBands(thermalBands, null, true);
}

// COLECCIONES LANDSAT A USAR --------------------------------------------------------
// Solo seleccionar la banda térmica ST_B10 y definir un cloud cover

var cloudCover = 20

var L9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2') 
  .select('ST_B10', 'QA_PIXEL')
  .filterBounds(points)
  .filter(ee.Filter.lt('CLOUD_COVER', cloudCover))
  .map(cloudMask)
  .map(applyScaleFactors)
  .map(function(image) {
    return image.set('SATELLITE', 'LANDSAT_9');
  });

var L8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2') 
  .select('ST_B10', 'QA_PIXEL')
  .filterBounds(points)
  .filter(ee.Filter.lt('CLOUD_COVER', cloudCover))
  .map(cloudMask)
  .map(applyScaleFactors)
  .map(function(image) {
    return image.set('SATELLITE', 'LANDSAT_8');
  });


// Combinar las colecciones
var LandsatColl = L8.merge(L9)
  .filterDate(startDate, endDate);


// SERIE TEMPORAL PARA CADA PUNTO -----------------------------------------------
var extractTemperature = function(feature) {
  var point = feature.geometry();
  var tempSeries = LandsatColl.map(function(image) {
    var temp = image.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: point,
      scale: 30
    }).get('ST_B10');
    var time = ee.Date(image.get('system:time_start')).format('HH:mm:ss');
    return ee.Feature(point, {
      'date': image.date().format('YYYY-MM-dd'), 
      'time': time,
      'temperature': temp,
      'satellite': image.get('SATELLITE')
    });
  });
  return tempSeries;
};


var tempCollection = points.map(extractTemperature).flatten();

// Exportar los resultados como CSV
Export.table.toDrive({
  collection: tempCollection,
  description: 'TemperatureTimeSeries1',
  fileFormat: 'CSV', 
  folder: 'GEE_export'
});


// VISUALIZAR ----------------------------------------------------------------------
Map.setOptions('SATELLITE');
Map.centerObject(points, 8);

// Solo los puntos
Map.addLayer(points, {color: 'red'}, 'Points');
